"use client";

/**
 * UNIFIED CHAT - Componente maestro que combina Groq y OpenRouter
 * Maneja routing inteligente según el proveedor del modelo
 */

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSWRConfig } from "swr";
import { unstable_serialize } from "swr/infinite";
import { ChatHeader } from "@/components/chat-header";
import type { ChatMessage } from "@/lib/types";
import { generateUUID } from "@/lib/utils";
import { Messages } from "./messages";
import { MultimodalInput } from "./multimodal-input";
import { getChatHistoryPaginationKey } from "./sidebar-history";
import {
  allUnifiedModels,
  getUnifiedModelsByContext,
  unifiedOmnicallDefaults,
  findUnifiedModel,
  type UnifiedModel,
} from "@/lib/ai/unified-models";

// ========================================
// HELPER: Extraer <think> tags
// ========================================
function extractThinkTags(content: string): {
  reasoning: string;
  text: string;
} {
  const thinkRegex = /<think>([\s\S]*?)<\/think>/gi;
  const matches = content.match(thinkRegex);

  if (!matches) {
    return { reasoning: "", text: content };
  }

  const reasoning = matches
    .map((match) => match.replace(/<\/?think>/gi, "").trim())
    .join("\n\n");

  const text = content.replace(thinkRegex, "").trim();

  return { reasoning, text };
}

// ========================================
// API CALLS: Groq
// ========================================
async function callGroqAPI(
  modelId: string,
  messages: Array<{ role: string; content: string | Array<any> }>
) {
  const cleanMessages = messages.map(({ role, content }) => ({
    role,
    content,
  }));

  const response = await fetch("/api/groq", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: modelId, messages: cleanMessages }),
  });

  const data = await response.json();

  if (!data.choices || !data.choices[0] || !data.choices[0].message) {
    throw new Error(`Invalid Groq response: ${JSON.stringify(data)}`);
  }

  return data.choices[0].message.content;
}

// ========================================
// API CALLS: OpenRouter
// ========================================
async function callOpenRouterAPI(
  modelId: string,
  messages: Array<{ role: string; content: string | Array<any> }>
) {
  const cleanMessages = messages.map(({ role, content }) => ({
    role,
    content,
  }));

  const response = await fetch("/api/openrouter", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: modelId, messages: cleanMessages }),
  });

  const data = await response.json();

  // Manejo de errores específicos de OpenRouter
  if (data.error) {
    const errorMsg = data.error.message || JSON.stringify(data.error);
    const errorCode = data.error.code;

    if (errorCode === 401) {
      throw new Error("❌ API Key inválida. Configura OPENROUTER_API_KEY");
    }

    if (errorCode === 404) {
      throw new Error("⚠️ Modelo no encontrado");
    }

    if (errorMsg.includes("No endpoints found matching your data policy")) {
      throw new Error("⚠️ Configura privacidad en openrouter.ai/settings/privacy");
    }

    if (errorCode === 429 || errorMsg.includes("rate_limit") || errorMsg.includes("Rate limit")) {
      throw new Error("⏳ Rate limit alcanzado");
    }

    throw new Error(errorMsg);
  }

  if (!data.choices || !data.choices[0] || !data.choices[0].message) {
    throw new Error(`Invalid OpenRouter response: ${JSON.stringify(data)}`);
  }

  return data.choices[0].message.content;
}

// ========================================
// ROUTER INTELIGENTE: Determina proveedor y llama API correspondiente
// ========================================
async function callUnifiedAPI(
  model: UnifiedModel,
  messages: Array<{ role: string; content: string | Array<any> }>
): Promise<string> {
  if (model.provider === 'groq') {
    return callGroqAPI(model.id, messages);
  } else if (model.provider === 'openrouter') {
    return callOpenRouterAPI(model.id, messages);
  } else {
    throw new Error(`Unknown provider: ${model.provider}`);
  }
}

// ========================================
// MODO SINGLE: Enviar a un solo modelo
// ========================================
async function sendToSingleModel(
  model: UnifiedModel,
  messages: ChatMessage[],
  userMessage: string,
  attachments: Array<{ url: string; contentType: string }> = []
): Promise<ChatMessage> {
  const simpleMessages = messages.map((msg) => ({
    role: msg.role,
    content:
      msg.parts?.map((p) => (p.type === "text" ? p.text : "")).join("") || "",
  }));

  // Preparar el último mensaje del usuario con imágenes si las hay
  let userContent: string | Array<any> = userMessage;

  if (attachments.length > 0 && model.supportsVision) {
    const contentParts: Array<any> = [];

    // Agregar texto primero
    if (userMessage.trim()) {
      contentParts.push({
        type: "text",
        text: userMessage,
      });
    }

    // Agregar imágenes
    attachments.forEach((attachment) => {
      if (attachment.contentType?.startsWith("image")) {
        contentParts.push({
          type: "image_url",
          image_url: {
            url: attachment.url,
          },
        });
      }
    });

    userContent = contentParts;
  }

  const content = await callUnifiedAPI(model, [
    ...simpleMessages,
    { role: "user", content: userContent },
  ]);

  const { reasoning, text } = extractThinkTags(content);

  const parts: any[] = [];
  if (reasoning) {
    parts.push({ type: "reasoning", text: reasoning });
  }
  parts.push({
    type: "text",
    text: `**${model.name}:**\n${text}`,
  });

  return {
    id: generateUUID(),
    role: "assistant",
    parts,
  };
}

// ========================================
// MODO OMNICALL: Enviar a múltiples modelos
// ========================================
async function sendToMultipleModels(
  models: UnifiedModel[],
  messages: ChatMessage[],
  userMessage: string,
  attachments: Array<{ url: string; contentType: string }> = []
): Promise<ChatMessage[]> {
  const simpleMessages = messages.map((msg) => ({
    role: msg.role,
    content:
      msg.parts?.map((p) => (p.type === "text" ? p.text : "")).join("") || "",
  }));

  const promises = models.map(async (model, index) => {
    const startTime = Date.now();
    console.log(`\n🚀 [${index + 1}/${models.length}] Testing: ${model.name} (${model.id})`);
    console.log(`   Provider: ${model.provider}`);
    console.log(`   Category: ${model.category}`);
    console.log(`   Vision: ${model.supportsVision}`);

    try {
      // Preparar el último mensaje del usuario con imágenes si las hay
      let userContent: string | Array<any> = userMessage;

      if (attachments.length > 0 && model.supportsVision) {
        const contentParts: Array<any> = [];

        // Agregar texto primero
        if (userMessage.trim()) {
          contentParts.push({
            type: "text",
            text: userMessage,
          });
        }

        // Agregar imágenes
        attachments.forEach((attachment) => {
          if (attachment.contentType?.startsWith("image")) {
            contentParts.push({
              type: "image_url",
              image_url: {
                url: attachment.url,
              },
            });
          }
        });

        userContent = contentParts;
      }

      const content = await callUnifiedAPI(model, [
        ...simpleMessages,
        { role: "user", content: userContent },
      ]);

      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(`✅ SUCCESS: ${model.name}`);
      console.log(`   Response time: ${duration}ms`);
      console.log(`   Response length: ${content.length} chars`);

      const { reasoning, text } = extractThinkTags(content);

      const parts: any[] = [];
      if (reasoning) {
        parts.push({
          type: "reasoning",
          text: `**${model.name} - Razonamiento:**\n${reasoning}`,
        });
      }
      parts.push({
        type: "text" as const,
        text: `**${model.name}:**\n${text}`,
      });

      return {
        id: generateUUID(),
        role: "assistant" as const,
        parts,
      };
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;

      console.error(`❌ FAILED: ${model.name}`);
      console.error(`   Duration: ${duration}ms`);
      console.error(`   Error:`, error);

      const errorMsg = error instanceof Error ? error.message : String(error);
      const isRateLimit =
        errorMsg.includes("rate_limit") ||
        errorMsg.includes("Rate limit") ||
        errorMsg.includes("429") ||
        errorMsg.includes("temporarily rate-limited");

      const isNotFound =
        errorMsg.includes("404") ||
        errorMsg.includes("not found") ||
        errorMsg.includes("does not exist");

      const isUnauthorized =
        errorMsg.includes("401") ||
        errorMsg.includes("unauthorized") ||
        errorMsg.includes("API Key");

      let errorType = "ERROR";
      if (isRateLimit) errorType = "RATE_LIMITED";
      if (isNotFound) errorType = "NOT_FOUND";
      if (isUnauthorized) errorType = "UNAUTHORIZED";

      console.error(`   Error type: ${errorType}`);

      return {
        id: generateUUID(),
        role: "assistant" as const,
        parts: [
          {
            type: "text" as const,
            text: `**${model.name}:**\n${
              isRateLimit
                ? "⚠️ Rate limit alcanzado"
                : isNotFound
                ? "❌ Modelo no existe"
                : isUnauthorized
                ? "🔒 No autorizado"
                : `❌ Error: ${errorMsg}`
            }`,
          },
        ],
      };
    }
  });

  return Promise.all(promises);
}

// ========================================
// COMPONENTE PRINCIPAL: UnifiedChat
// ========================================
export function UnifiedChat({
  id,
  initialMessages = [],
}: {
  id: string;
  initialMessages?: ChatMessage[];
}) {
  const router = useRouter();
  const { mutate } = useSWRConfig();
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<UnifiedModel>(
    allUnifiedModels[0]
  );
  const [sendToAll, setSendToAll] = useState(false);
  const [codeMode, setCodeMode] = useState(false);
  const [godMode, setGodMode] = useState(false);
  const [hasNavigated, setHasNavigated] = useState(initialMessages.length > 0);
  const [attachments, setAttachments] = useState<
    Array<{ url: string; name: string; contentType: string }>
  >([]);

  const sendToAllRef = useRef(sendToAll);
  const selectedModelRef = useRef(selectedModel);
  const attachmentsRef = useRef(attachments);
  const codeModeRef = useRef(codeMode);
  const godModeRef = useRef(godMode);

  useEffect(() => {
    sendToAllRef.current = sendToAll;
    selectedModelRef.current = selectedModel;
    attachmentsRef.current = attachments;
    codeModeRef.current = codeMode;
    godModeRef.current = godMode;
  }, [sendToAll, selectedModel, attachments, codeMode, godMode]);

  // Determinar contexto actual y modelos disponibles
  const currentContext = attachments.length > 0
    ? 'multimodal'
    : (codeMode ? 'code' : 'text');

  const availableModels = getUnifiedModelsByContext(currentContext);

  // Cambiar automáticamente al primer modelo disponible cuando cambia el contexto
  useEffect(() => {
    if (availableModels.length > 0 && !sendToAll) {
      // Solo cambiar si el modelo actual no está en la lista disponible
      const isCurrentModelAvailable = availableModels.some(
        m => m.id === selectedModel.id
      );
      if (!isCurrentModelAvailable) {
        setSelectedModel(availableModels[0]);
      }
    }
  }, [currentContext, sendToAll]); // Removido selectedModel y availableModels de deps para evitar loop

  // Guardar chat en BD cuando cambian los mensajes
  useEffect(() => {
    if (messages.length > 0) {
      saveChatToDB(id, messages);
    }
  }, [messages, id]);

  const saveChatToDB = async (chatId: string, messages: ChatMessage[]) => {
    try {
      const response = await fetch("/api/chat/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId, messages }),
      });

      if (response.ok) {
        console.log("[CLIENT] Unified chat saved successfully");
        mutate(unstable_serialize(getChatHistoryPaginationKey));
      } else {
        if (response.status === 401) {
          console.log("[CLIENT] Unauthorized - user not logged in");
          return;
        }

        const errorData = await response
          .json()
          .catch(() => ({ error: "Unknown error" }));
        console.error("[CLIENT] Error saving unified chat:", errorData);
      }
    } catch (error) {
      console.error(
        "[CLIENT] Network error saving unified chat:",
        error instanceof Error ? error.message : error
      );
    }
  };

  const sendMessage = useCallback(
    async (message?: any, options?: any) => {
      if (!message) return;

      const fullMessage: ChatMessage = {
        id: message.id || generateUUID(),
        role: message.role || "user",
        parts: message.parts || [],
        ...message,
      };

      const messageText =
        fullMessage.parts
          ?.map((p) => (p.type === "text" ? p.text : ""))
          .join("") || "";
      if (!messageText.trim() && attachmentsRef.current.length === 0) return;

      setMessages((prev) => [...prev, fullMessage]);
      setInput("");
      setLoading(true);

      const currentAttachments = attachmentsRef.current;
      const context = currentAttachments.length > 0
        ? 'multimodal'
        : (codeModeRef.current ? 'code' : 'text');

      try {
        if (godModeRef.current) {
          // GOD MODE: enviar a TODOS los modelos para debuggear
          console.log("🔥 GOD MODE ACTIVATED - Testing ALL models");
          console.log(`📊 Total models to test: ${allUnifiedModels.length}`);

          const responses = await sendToMultipleModels(
            allUnifiedModels,
            messages,
            messageText,
            currentAttachments
          );
          setMessages((prev) => [...prev, ...responses]);
        } else if (sendToAllRef.current) {
          // Modo omnicall: enviar a modelos top de la categoría
          const modelIdsToUse = unifiedOmnicallDefaults[context];
          const modelsToUse = allUnifiedModels.filter((m) =>
            modelIdsToUse.includes(m.id)
          );

          const responses = await sendToMultipleModels(
            modelsToUse,
            messages,
            messageText,
            currentAttachments
          );
          setMessages((prev) => [...prev, ...responses]);
        } else {
          // Modo single: enviar solo al modelo seleccionado
          const response = await sendToSingleModel(
            selectedModelRef.current,
            messages,
            messageText,
            currentAttachments
          );
          setMessages((prev) => [...prev, response]);
        }

        // Limpiar attachments después de enviar
        setAttachments([]);

        // Actualizar URL sin recargar después del primer mensaje
        if (!hasNavigated) {
          setHasNavigated(true);
          window.history.replaceState(null, "", `/chat/${id}`);
        }
      } catch (error) {
        console.error("Error:", error);
        setMessages((prev) => [
          ...prev,
          {
            id: generateUUID(),
            role: "assistant",
            parts: [{ type: "text", text: "Error al enviar mensaje" }],
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [messages, sendToAll, selectedModel, codeMode, id, hasNavigated]
  );

  const status = loading ? "streaming" : "ready";

  return (
    <div className="overscroll-behavior-contain flex h-dvh min-w-0 touch-pan-y flex-col bg-background">
      <ChatHeader
        chatId={id}
        isReadonly={false}
        selectedVisibilityType="private"
      />

      <Messages
        chatId={id}
        isArtifactVisible={false}
        isReadonly={false}
        messages={messages}
        regenerate={async () => {}}
        selectedModelId={selectedModel.id}
        setMessages={setMessages}
        status={status}
        votes={[]}
      />

      <div className="sticky bottom-0 z-1 mx-auto flex w-full max-w-4xl gap-2 border-t-0 bg-background px-2 pb-3 md:px-4 md:pb-4">
        <MultimodalInput
          attachments={attachments}
          chatId={id}
          input={input}
          messages={messages}
          onModelChange={() => {}}
          selectedModelId={selectedModel.id}
          selectedVisibilityType="private"
          sendMessage={sendMessage}
          setAttachments={setAttachments}
          setInput={setInput}
          setMessages={setMessages}
          status={status}
          stop={() => {}}
          usage={undefined}
        />
      </div>
    </div>
  );
}
