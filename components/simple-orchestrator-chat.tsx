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

const groqModels = [
  { id: "openai/gpt-oss-120b", name: "GPT-OSS 120B" },
  { id: "groq/compound", name: "Groq Compound" },
  { id: "moonshotai/kimi-k2-instruct-0905", name: "Kimi K2 0905" },
  { id: "qwen/qwen3-32b", name: "Qwen3 32B" },
  { id: "meta-llama/llama-4-maverick-17b-128e-instruct", name: "Llama 4 Maverick" },
];

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
  messages: Array<{ role: string; content: string }>
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

// Modo single: envía a un solo modelo
async function sendToSingleModel(
  model: typeof groqModels[0],
  messages: ChatMessage[],
  userMessage: string
): Promise<ChatMessage> {
  const simpleMessages = messages.map((msg) => ({
    role: msg.role,
    content:
      msg.parts?.map((p) => (p.type === "text" ? p.text : "")).join("") || "",
  }));

  const content = await callGroqAI(model.id, [
    ...simpleMessages,
    { role: "user", content: userMessage },
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
  userMessage: string
): Promise<ChatMessage[]> {
  const simpleMessages = messages.map((msg) => ({
    role: msg.role,
    content:
      msg.parts?.map((p) => (p.type === "text" ? p.text : "")).join("") || "",
  }));

  const promises = groqModels.map(async (model) => {
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

  const sendToAllRef = useRef(sendToAll);
  const selectedGroqModelRef = useRef(selectedGroqModel);

  useEffect(() => {
    sendToAllRef.current = sendToAll;
    selectedGroqModelRef.current = selectedGroqModel;
  }, [sendToAll, selectedGroqModel]);

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
      if (!messageText.trim()) return;

      setMessages((prev) => [...prev, fullMessage]);
      setInput("");
      setLoading(true);

      try {
        if (sendToAllRef.current) {
          // Modo orquesta: enviar a todos los modelos
          const responses = await sendToAllModels(messages, messageText);
          setMessages((prev) => [...prev, ...responses]);
        } else {
          // Modo single: enviar solo al modelo seleccionado
          const response = await sendToSingleModel(
            selectedGroqModelRef.current,
            messages,
            messageText
          );
          setMessages((prev) => [...prev, response]);
        }

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
          attachments={[]}
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
          setAttachments={() => {}}
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
