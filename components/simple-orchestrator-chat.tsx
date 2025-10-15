"use client";

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

// Modelos para consultas de texto (usados en modo Omnicall sin imágenes)
const textModels = [
  { id: "openai/gpt-oss-120b", name: "GPT-OSS 120B", supportsVision: false },
  { id: "groq/compound", name: "Groq Compound", supportsVision: false },
  {
    id: "moonshotai/kimi-k2-instruct-0905",
    name: "Kimi K2 0905",
    supportsVision: false,
  },
  { id: "qwen/qwen3-32b", name: "Qwen3 32B", supportsVision: false },
];

// Modelos de visión (solo para imágenes)
const visionModels = [
  {
    id: "meta-llama/llama-4-maverick-17b-128e-instruct",
    name: "Llama 4 Maverick",
    supportsVision: true,
  },
  {
    id: "meta-llama/llama-4-scout-17b-16e-instruct",
    name: "Llama 4 Scout",
    supportsVision: true,
  },
];

// Todos los modelos combinados (para selector individual)
const groqModels = [...textModels, ...visionModels];

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

async function callGroqAI(
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
    throw new Error(`Invalid response: ${JSON.stringify(data)}`);
  }

  return data.choices[0].message.content;
}

async function callCerebrasAI(
  messages: Array<{ role: string; content: string }>
): Promise<{ content: string; reasoning?: string }> {
  const response = await fetch("/api/cerebras", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-oss-120b", // Modelo con soporte para reasoning
      messages,
      max_completion_tokens: 65_536, // Máximo de tokens de completación
      temperature: 1,
      top_p: 1,
      reasoning_effort: "high", // Razonamiento profundo y extenso
    }),
  });

  const data = await response.json();

  if (!data.choices || !data.choices[0] || !data.choices[0].message) {
    throw new Error(`Invalid Cerebras response: ${JSON.stringify(data)}`);
  }

  const message = data.choices[0].message;

  return {
    content: message.content || "",
    reasoning: message.reasoning, // Campo separado de reasoning
  };
}

// Modo single: envía a un solo modelo
async function sendToSingleModel(
  model: (typeof groqModels)[0],
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

  const content = await callGroqAI(model.id, [
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

// Modo orquesta: envía a todos los modelos
async function sendToAllModels(
  messages: ChatMessage[],
  userMessage: string,
  attachments: Array<{ url: string; contentType: string }> = []
): Promise<ChatMessage[]> {
  const simpleMessages = messages.map((msg) => ({
    role: msg.role,
    content:
      msg.parts?.map((p) => (p.type === "text" ? p.text : "")).join("") || "",
  }));

  // Si hay imágenes, usar SOLO modelos de visión (Llama)
  if (attachments.length > 0) {
    const promises = visionModels.map(async (model) => {
      try {
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

        const content = await callGroqAI(model.id, [
          ...simpleMessages,
          { role: "user", content: contentParts },
        ]);

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
        console.error(`Error with ${model.name}:`, error);

        const errorMsg = error instanceof Error ? error.message : String(error);
        const isRateLimit =
          errorMsg.includes("rate_limit") || errorMsg.includes("Rate limit");

        return {
          id: generateUUID(),
          role: "assistant" as const,
          parts: [
            {
              type: "text" as const,
              text: `**${model.name}:**\n${isRateLimit ? "Rate limit alcanzado - intenta de nuevo en unos segundos" : `Error: ${errorMsg}`}`,
            },
          ],
        };
      }
    });

    return Promise.all(promises);
  }

  // Si NO hay imágenes, usar los 4 modelos de texto y generar mega-resumen con Cerebras
  try {
    // 1. Enviar a los 4 modelos de texto en paralelo
    const promises = textModels.map(async (model) => {
      try {
        const content = await callGroqAI(model.id, [
          ...simpleMessages,
          { role: "user", content: userMessage },
        ]);

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
          modelName: model.name,
          response: text,
          message: {
            id: generateUUID(),
            role: "assistant" as const,
            parts,
          },
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        const isRateLimit =
          errorMsg.includes("rate_limit") || errorMsg.includes("Rate limit");

        return {
          modelName: model.name,
          response: `Error: ${errorMsg}`,
          message: {
            id: generateUUID(),
            role: "assistant" as const,
            parts: [
              {
                type: "text" as const,
                text: `**${model.name}:**\n${isRateLimit ? "Rate limit alcanzado - intenta de nuevo en unos segundos" : `Error: ${errorMsg}`}`,
              },
            ],
          },
        };
      }
    });

    const modelResponses = await Promise.all(promises);

    // 2. Concatenar las respuestas para Cerebras
    const concatenatedResponses = modelResponses
      .map(({ modelName, response }) => `### ${modelName}:\n${response}`)
      .join("\n\n---\n\n");

    // 3. Enviar a Cerebras para generar mega-resumen consolidado con reasoning
    const cerebrasResponse = await callCerebrasAI([
      {
        role: "system",
        content:
          "Eres un asistente experto en sintetizar y consolidar información de múltiples fuentes. Tu tarea es:\n\n1. ANALIZAR profundamente cada respuesta proporcionada\n2. IDENTIFICAR patrones, similitudes y diferencias entre las respuestas\n3. INTEGRAR toda la información en un mega-resumen magistral\n4. PROFUNDIZAR en cada punto relevante sin reducir la cobertura\n5. COMBINAR las mejores ideas en una respuesta coherente, completa y exhaustiva\n\nIMPORTANTE: NO reduzcas ni simplifiques en exceso. El resumen debe ser extenso, detallado y abarcar TODOS los puntos mencionados por los modelos.",
      },
      {
        role: "user",
        content: `Pregunta original del usuario: "${userMessage}"\n\n===== RESPUESTAS DE MÚLTIPLES MODELOS =====\n\n${concatenatedResponses}\n\n===== TU TAREA =====\n\nAnaliza todas las respuestas anteriores y genera un mega-resumen consolidado que:\n- Integre TODA la información proporcionada\n- Profundice en cada punto mencionado\n- Identifique insights únicos de cada modelo\n- Proporcione una respuesta completa, detallada y magistral\n\nUtiliza tu capacidad de reasoning para analizar en profundidad antes de generar la respuesta final.`,
      },
    ]);

    // El reasoning viene en campo separado desde la API
    const megaReasoning = cerebrasResponse.reasoning || "";
    const megaResumen = cerebrasResponse.content || "";

    // 4. Retornar todas las respuestas individuales + el mega-resumen al final
    const individualMessages = modelResponses.map(({ message }) => message);

    const megaResumenParts: any[] = [];

    // Agregar reasoning si existe
    if (megaReasoning) {
      megaResumenParts.push({
        type: "reasoning",
        text: `\n${megaReasoning}`,
      });
    }

    // Agregar el resumen consolidado
    megaResumenParts.push({
      type: "text" as const,
      text: `**Resumen Consolidado (Cerebras GPT-120 reasoning high):**\n\n${megaResumen}`,
    });

    const megaResumenMessage = {
      id: generateUUID(),
      role: "assistant" as const,
      parts: megaResumenParts,
    };

    return [...individualMessages, megaResumenMessage];
  } catch (error) {
    console.error("Error en modo orquesta con mega-resumen:", error);

    return [
      {
        id: generateUUID(),
        role: "assistant" as const,
        parts: [
          {
            type: "text" as const,
            text: `Error al generar mega-resumen: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      },
    ];
  }
}

export function SimpleOrchestratorChat({
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
  const [selectedGroqModel, setSelectedGroqModel] = useState(groqModels[0]);
  const [sendToAll, setSendToAll] = useState(true);
  const [hasNavigated, setHasNavigated] = useState(initialMessages.length > 0);
  const [attachments, setAttachments] = useState<
    Array<{ url: string; name: string; contentType: string }>
  >([]);

  const sendToAllRef = useRef(sendToAll);
  const selectedGroqModelRef = useRef(selectedGroqModel);
  const attachmentsRef = useRef(attachments);

  useEffect(() => {
    sendToAllRef.current = sendToAll;
    selectedGroqModelRef.current = selectedGroqModel;
    attachmentsRef.current = attachments;
  }, [sendToAll, selectedGroqModel, attachments]);

  // Sincronizar mensajes cuando cambie el ID o initialMessages
  useEffect(() => {
    if (initialMessages.length > 0) {
      setMessages(initialMessages);
    }
  }, [id, initialMessages]);

  // Cambiar automáticamente a Llama 4 Maverick cuando se sube una imagen en modo individual
  useEffect(() => {
    if (attachments.length > 0 && !sendToAll) {
      // Si el modelo actual no soporta vision, cambiar a Maverick
      if (!selectedGroqModel.supportsVision) {
        const maverickModel = groqModels.find(
          (m) => m.id === "meta-llama/llama-4-maverick-17b-128e-instruct"
        );
        if (maverickModel) {
          setSelectedGroqModel(maverickModel);
        }
      }
    }
  }, [attachments, sendToAll, selectedGroqModel]);

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
        console.log("[CLIENT] Chat saved successfully");
        mutate(unstable_serialize(getChatHistoryPaginationKey));
      } else {
        if (response.status === 401) {
          console.log("[CLIENT] Unauthorized - user not logged in");
          return;
        }

        const errorData = await response
          .json()
          .catch(() => ({ error: "Unknown error" }));
        console.error("[CLIENT] Error saving chat:", errorData);
      }
    } catch (error) {
      console.error(
        "[CLIENT] Network error saving chat:",
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

      try {
        if (sendToAllRef.current) {
          // Modo orquesta: enviar a todos los modelos (solo vision si hay imágenes)
          const responses = await sendToAllModels(
            messages,
            messageText,
            currentAttachments
          );
          setMessages((prev) => [...prev, ...responses]);
        } else {
          // Modo single: enviar solo al modelo seleccionado
          const response = await sendToSingleModel(
            selectedGroqModelRef.current,
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
    [messages, sendToAll, selectedGroqModel, id, hasNavigated]
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
        selectedModelId={selectedGroqModel.id}
        setMessages={setMessages}
        status={status}
        votes={[]}
      />

      <div className="sticky bottom-0 z-1 mx-auto flex w-full max-w-4xl gap-2 border-t-0 bg-background px-2 pb-3 md:px-4 md:pb-4">
        <MultimodalInput
          attachments={attachments}
          chatId={id}
          groqModels={groqModels}
          input={input}
          messages={messages}
          onModelChange={() => {}}
          selectedGroqModel={selectedGroqModel}
          selectedModelId={selectedGroqModel.id}
          selectedVisibilityType="private"
          sendMessage={sendMessage}
          sendToAll={sendToAll}
          setAttachments={setAttachments}
          setInput={setInput}
          setMessages={setMessages}
          setSelectedGroqModel={setSelectedGroqModel}
          setSendToAll={setSendToAll}
          status={status}
          stop={() => {}}
          usage={undefined}
        />
      </div>
    </div>
  );
}
