"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { unstable_serialize } from "swr/infinite";
import { ChatHeader } from "@/components/chat-header";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useArtifactSelector } from "@/hooks/use-artifact";
import { useAutoResume } from "@/hooks/use-auto-resume";
import { useChatVisibility } from "@/hooks/use-chat-visibility";
import type { Vote } from "@/lib/db/schema";
import { ChatSDKError } from "@/lib/errors";
import type { Attachment, ChatMessage } from "@/lib/types";
import type { AppUsage } from "@/lib/usage";
import { fetcher, fetchWithErrorHandlers, generateUUID } from "@/lib/utils";
import { Artifact } from "./artifact";
import { useDataStream } from "./data-stream-provider";
import { Messages } from "./messages";
import { MultimodalInput } from "./multimodal-input";
import { getChatHistoryPaginationKey } from "./sidebar-history";
import { toast } from "./toast";
import type { VisibilityType } from "./visibility-selector";

const groqModels = [
  { id: "openai/gpt-oss-120b", name: "GPT-OSS 120B" },
  { id: "groq/compound", name: "Groq Compound" },
  { id: "moonshotai/kimi-k2-instruct-0905", name: "Kimi K2 0905" },
  { id: "qwen/qwen3-32b", name: "Qwen3 32B" },
  { id: "meta-llama/llama-4-maverick-17b-128e-instruct", name: "Llama 4 Maverick" },
  { id: "meta-llama/llama-4-scout-17b-16e-instruct", name: "Llama 4 Scout" },
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

  // Extraer todo el contenido de las etiquetas <think>
  const reasoning = matches
    .map((match) => match.replace(/<\/?think>/gi, "").trim())
    .join("\n\n");

  // Remover las etiquetas <think> del texto
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

// Modo single: envia a un solo modelo
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

// Modo orquesta: envia a todos los modelos
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
      return {
        id: generateUUID(),
        role: "assistant" as const,
        parts: [
          {
            type: "text" as const,
            text: `**${model.name}:**\nError al obtener respuesta: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
        ],
      };
    }
  });

  return Promise.all(promises);
}

export function Chat({
  id,
  initialMessages,
  initialChatModel,
  initialVisibilityType,
  isReadonly,
  autoResume,
  initialLastContext,
}: {
  id: string;
  initialMessages: ChatMessage[];
  initialChatModel: string;
  initialVisibilityType: VisibilityType;
  isReadonly: boolean;
  autoResume: boolean;
  initialLastContext?: AppUsage;
}) {
  const { visibilityType } = useChatVisibility({
    chatId: id,
    initialVisibilityType,
  });

  const { mutate } = useSWRConfig();
  const { setDataStream } = useDataStream();

  const [input, setInput] = useState<string>("");
  const [usage, setUsage] = useState<AppUsage | undefined>(initialLastContext);
  const [showCreditCardAlert, setShowCreditCardAlert] = useState(false);
  const [currentModelId, setCurrentModelId] = useState(initialChatModel);
  const currentModelIdRef = useRef(currentModelId);
  const [selectedGroqModel, setSelectedGroqModel] = useState(groqModels[0]);
  const [sendToAll, setSendToAll] = useState(false);

  useEffect(() => {
    currentModelIdRef.current = currentModelId;
  }, [currentModelId]);

  const {
    messages,
    setMessages,
    sendMessage: originalSendMessage,
    status,
    stop,
    regenerate,
    resumeStream,
  } = useChat<ChatMessage>({
    id,
    messages: initialMessages,
    experimental_throttle: 100,
    generateId: generateUUID,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      fetch: fetchWithErrorHandlers,
      prepareSendMessagesRequest(request) {
        return {
          body: {
            id: request.id,
            message: request.messages.at(-1),
            selectedChatModel: currentModelIdRef.current,
            selectedVisibilityType: visibilityType,
            ...request.body,
          },
        };
      },
    }),
    onData: (dataPart) => {
      setDataStream((ds) => (ds ? [...ds, dataPart] : []));
      if (dataPart.type === "data-usage") {
        setUsage(dataPart.data);
      }
    },
    onFinish: () => {
      mutate(unstable_serialize(getChatHistoryPaginationKey));
    },
    onError: (error) => {
      if (error instanceof ChatSDKError) {
        // Check if it's a credit card error
        if (
          error.message?.includes("AI Gateway requires a valid credit card")
        ) {
          setShowCreditCardAlert(true);
        } else {
          toast({
            type: "error",
            description: error.message,
          });
        }
      }
    },
  });

  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const isArtifactVisible = useArtifactSelector((state) => state.isVisible);

  const sendMessage = useCallback<typeof originalSendMessage>(
    async (message, options) => {
      if (!message) return;

      const msg = message as any;
      const messageWithId: ChatMessage = {
        id: msg.id || generateUUID(),
        role: msg.role || "user",
        parts: msg.parts || [],
        ...msg,
      };

      const messageText =
        messageWithId.parts
          ?.map((p) => (p.type === "text" ? p.text : ""))
          .join("") || "";
      if (!messageText.trim()) return;

<<<<<<< HEAD
      setMessages((prev) => [...prev, messageWithId]);

      try {
        if (sendToAll) {
          // Modo orquesta: enviar a todos los modelos
          const responses = await sendToAllModels(messages, messageText);
          setMessages((prev) => [...prev, ...responses]);
        } else {
          // Modo single: enviar solo al modelo seleccionado
          const response = await sendToSingleModel(
            selectedGroqModel,
            messages,
            messageText
          );
          setMessages((prev) => [...prev, response]);
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
=======
    // Si no es modo orquesta, enviar solo al modelo seleccionado
    if (!sendToAll) {
      // Usar originalSendMessage que maneja el estado internamente
      try {
        await originalSendMessage({
          ...messageWithId,
          content: messageText
        }, options);
      } catch (error) {
        console.error("Error:", error);
        // Usar originalSendMessage para el mensaje de error también
        await originalSendMessage({
          id: generateUUID(),
          role: "assistant",
          content: "Error al enviar mensaje"
        }, options);
>>>>>>> c50c5538c7f29d13f0a87f69f37c03f5c19f5bc5
      }
    },
    [messages, sendToAll, selectedGroqModel, setMessages]
  );

  const searchParams = useSearchParams();
  const query = searchParams.get("query");

  const [hasAppendedQuery, setHasAppendedQuery] = useState(false);

  useEffect(() => {
    if (query && !hasAppendedQuery) {
      sendMessage({
        id: generateUUID(),
        role: "user" as const,
        parts: [{ type: "text", text: query }],
      });

      setHasAppendedQuery(true);
      window.history.replaceState({}, "", `/chat/${id}`);
    }
  }, [query, sendMessage, hasAppendedQuery, id]);

  const { data: votes } = useSWR<Vote[]>(
    messages.length >= 2 ? `/api/vote?chatId=${id}` : null,
    fetcher
  );

  useAutoResume({
    autoResume,
    initialMessages,
    resumeStream,
    setMessages,
  });

  return (
    <>
      <div className="overscroll-behavior-contain flex h-dvh min-w-0 touch-pan-y flex-col bg-background">
        <ChatHeader
          chatId={id}
          isReadonly={isReadonly}
          selectedVisibilityType={initialVisibilityType}
        />

        <Messages
          chatId={id}
          isArtifactVisible={isArtifactVisible}
          isReadonly={isReadonly}
          messages={messages}
          regenerate={regenerate}
          selectedModelId={initialChatModel}
          setMessages={setMessages}
          status={status}
          votes={votes}
        />

        <div className="sticky bottom-0 z-1 mx-auto flex w-full max-w-4xl gap-2 border-t-0 bg-background px-2 pb-3 md:px-4 md:pb-4">
          {!isReadonly && (
            <MultimodalInput
              attachments={attachments}
              chatId={id}
              groqModels={groqModels}
              input={input}
              messages={messages}
              onModelChange={setCurrentModelId}
              selectedGroqModel={selectedGroqModel}
              selectedModelId={currentModelId}
              selectedVisibilityType={visibilityType}
              sendMessage={sendMessage}
              sendToAll={sendToAll}
              setAttachments={setAttachments}
              setInput={setInput}
              setMessages={setMessages}
              setSelectedGroqModel={setSelectedGroqModel}
              setSendToAll={setSendToAll}
              status={status}
              stop={stop}
              usage={usage}
            />
          )}
        </div>
      </div>

      <Artifact
        attachments={attachments}
        chatId={id}
        input={input}
        isReadonly={isReadonly}
        messages={messages}
        regenerate={regenerate}
        selectedModelId={currentModelId}
        selectedVisibilityType={visibilityType}
        sendMessage={sendMessage}
        setAttachments={setAttachments}
        setInput={setInput}
        setMessages={setMessages}
        status={status}
        stop={stop}
        votes={votes}
      />

      <AlertDialog
        onOpenChange={setShowCreditCardAlert}
        open={showCreditCardAlert}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Activate AI Gateway</AlertDialogTitle>
            <AlertDialogDescription>
              This application requires{" "}
              {process.env.NODE_ENV === "production" ? "the owner" : "you"} to
              activate Vercel AI Gateway.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                window.open(
                  "https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai%3Fmodal%3Dadd-credit-card",
                  "_blank"
                );
                window.location.href = "/";
              }}
            >
              Activate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
