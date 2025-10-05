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

// Constantes para evitar regex en tiempo de ejecución
const WORD_SPLIT_REGEX = /\s+/;

// Función para estimar tokens y truncar texto
function truncateToTokenLimit(text: string, maxTokens = 6000) {
  const words = text.split(WORD_SPLIT_REGEX);
  const estimatedTokens = Math.ceil(words.length * 1.3);

  if (estimatedTokens <= maxTokens) {
    return text;
  }

  const ratio = maxTokens / estimatedTokens;
  const keepWords = Math.floor(words.length * ratio);

  return `${words.slice(0, keepWords).join(" ")}\n\n[Texto truncado para ajustarse al límite de tokens]`;
}

const groqModels = [
  { id: "openai/gpt-oss-120b", name: "GPT-OSS 120B", includeInSummary: false },
  { id: "deepseek-r1-distill-llama-70b", name: "DeepSeek R1 70B", includeInSummary: true },
  { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B", includeInSummary: true },
  { id: "qwen/qwen3-32b", name: "Qwen3 32B", includeInSummary: true },
  { id: "moonshotai/kimi-k2-instruct", name: "Kimi K2", includeInSummary: true },
  { id: "openai/gpt-oss-20b", name: "GPT-OSS 20B", includeInSummary: false },
  { id: "gemma2-9b-it", name: "Gemma 2 9B", includeInSummary: false },
  { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B", includeInSummary: false },
  { id: "moonshotai/kimi-k2-instruct-0905", name: "Kimi K2 0905", includeInSummary: false },
  { id: "meta-llama/llama-4-maverick-17b-128e-instruct", name: "Llama 4 Maverick", includeInSummary: false },
  { id: "meta-llama/llama-4-scout-17b-16e-instruct", name: "Llama 4 Scout", includeInSummary: false },
  { id: "groq/compound", name: "Groq Compound", includeInSummary: false },
  { id: "groq/compound-mini", name: "Groq Compound Mini", includeInSummary: false },
];

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
  const [sendToAll, setSendToAll] = useState(true);
  const [summarizeAll, setSummarizeAll] = useState(true);

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

  const sendMessage = useCallback(async (message?: ChatMessage) => {
    if (!message) return;

    if (!sendToAll) {
      // Usar el sendMessage original del chatbot
      return originalSendMessage(message);
    }

    // Modo orquesta: enviar a todos los modelos Groq
    const messageText = message.parts?.map(p => p.type === 'text' ? p.text : '').join('') || '';
    if (!messageText.trim()) return;

    setMessages((prev) => [...prev, message]);

    try {
      const targetModels = groqModels.filter(
        (m) => m.id !== "openai/gpt-oss-120b"
      );

      const promises = targetModels.map(async (model) => {
        try {
          const simpleMessages = messages.map(msg => ({
            role: msg.role,
            content: msg.parts?.map(p => p.type === 'text' ? p.text : '').join('') || ''
          }));

          const content = await callGroqAI(model.id, [
            ...simpleMessages,
            { role: "user", content: messageText }
          ]);

          return {
            id: generateUUID(),
            role: "assistant" as const,
            parts: [{ type: "text" as const, text: `**${model.name}:**\n${content}` }],
          };
        } catch (error) {
          console.error(`Error with ${model.name}:`, error);
          return {
            id: generateUUID(),
            role: "assistant" as const,
            parts: [{
              type: "text" as const,
              text: `**${model.name}:**\nError al obtener respuesta: ${error instanceof Error ? error.message : "Unknown error"}`
            }],
          };
        }
      });

      const responses = await Promise.all(promises);
      setMessages((prev) => [...prev, ...responses]);

      // Si summarizeAll está activado, crear resumen con GPT-120B
      if (summarizeAll) {
        try {
          const responsesForSummary = responses.filter((r, idx) => {
            const model = targetModels[idx];
            return model?.includeInSummary === true;
          });

          const promptTokens = 500;
          const maxSummaryTokens = 5500;
          const availableTokens = maxSummaryTokens - promptTokens;
          const maxTokensPerResponse = Math.min(
            800,
            Math.floor(availableTokens / responsesForSummary.length)
          );

          const processedResponses = responsesForSummary.map((r) => {
            const textContent = r.parts.map(p => p.type === 'text' ? p.text : '').join('');
            return truncateToTokenLimit(textContent, maxTokensPerResponse);
          });

          const concatenatedResponses = processedResponses.join("\n\n---\n\n");

          let summaryContent;
          let summaryModel = "GPT-OSS 120B";

          try {
            summaryContent = await callGroqAI("openai/gpt-oss-120b", [
              {
                role: "user",
                content: `Actúa como un experto analista con amplio conocimiento en el tema. Tu objetivo es crear una respuesta definitiva y magistral basada en las siguientes perspectivas expertas. No las compares entre sí; úsalas como fundamento para construir una explicación superior.

PROCESO DE SÍNTESIS:
1. Absorbe los conceptos clave y matices de cada respuesta
2. Identifica patrones, conexiones y aspectos complementarios
3. Integra los insights en una narrativa coherente y elevada
4. Añade valor mediante análisis profundo y contexto adicional

CRITERIOS PARA LA RESPUESTA:
- Construye sobre las ideas más sólidas de cada perspectiva
- Mantén un hilo conductor claro y progresivo
- Profundiza en los puntos más relevantes
- Aporta una visión unificada que trascienda las respuestas individuales

CONTEXTO:
${concatenatedResponses}

Basándote en todo lo anterior, desarrolla una respuesta magistral que eleve la discusión al siguiente nivel:`,
              },
            ]);
          } catch (gptError: any) {
            console.warn("⚠️ GPT-120B failed, falling back to DeepSeek R1 70B");
            summaryModel = "DeepSeek R1 70B (Fallback)";
            summaryContent = await callGroqAI("deepseek-r1-distill-llama-70b", [
              {
                role: "user",
                content: `Actúa como un experto analista con amplio conocimiento en el tema. Tu objetivo es crear una respuesta definitiva y magistral basada en las siguientes perspectivas expertas. No las compares entre sí; úsalas como fundamento para construir una explicación superior.

PROCESO DE SÍNTESIS:
1. Absorbe los conceptos clave y matices de cada respuesta
2. Identifica patrones, conexiones y aspectos complementarios
3. Integra los insights en una narrativa coherente y elevada
4. Añade valor mediante análisis profundo y contexto adicional

CRITERIOS PARA LA RESPUESTA:
- Construye sobre las ideas más sólidas de cada perspectiva
- Mantén un hilo conductor claro y progresivo
- Profundiza en los puntos más relevantes
- Aporta una visión unificada que trascienda las respuestas individuales

CONTEXTO:
${concatenatedResponses}

Basándote en todo lo anterior, desarrolla una respuesta magistral que eleve la discusión al siguiente nivel:`,
              },
            ]);
          }

          setMessages((prev) => [
            ...prev,
            {
              id: generateUUID(),
              role: "assistant",
              parts: [{
                type: "text",
                text: `**📝 Resumen (${summaryModel}):**\n${summaryContent}`
              }],
            },
          ]);
        } catch (error) {
          console.error("Error creating summary:", error);
        }
      }
    } catch (error) {
      console.error("Error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: generateUUID(),
          role: "assistant",
          parts: [{ type: "text", text: "Error al enviar mensaje" }]
        },
      ]);
    }
  }, [messages, sendToAll, summarizeAll, selectedGroqModel, originalSendMessage, setMessages]);

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
              setSendToAll={(checked) => {
                setSendToAll(checked);
                setSummarizeAll(checked);
              }}
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
