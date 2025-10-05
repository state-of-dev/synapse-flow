"use client";

import { useCallback, useEffect, useState } from "react";
import { ChatHeader } from "@/components/chat-header";
import type { ChatMessage } from "@/lib/types";
import { generateUUID } from "@/lib/utils";
import { Messages } from "./messages";
import { MultimodalInput } from "./multimodal-input";

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

  let content = data.choices[0].message.content;

  // Limpiar tags especiales de DeepSeek R1 y otros modelos
  content = content.replace(/<think>[\s\S]*?<\/think>/g, '');
  content = content.replace(/<\/?think>/g, '');

  return content.trim();
}

export function SimpleOrchestratorChat({
  id,
  initialMessages = [],
}: {
  id: string;
  initialMessages?: ChatMessage[];
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [selectedGroqModel, setSelectedGroqModel] = useState(groqModels[0]);
  const [sendToAll, setSendToAll] = useState(true);
  const [summarizeAll, setSummarizeAll] = useState(true);

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

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error("Error saving chat:", errorData);
      }
    } catch (error) {
      console.error("Error saving chat:", error instanceof Error ? error.message : error);
    }
  };

  const sendMessage = useCallback(async (message: ChatMessage) => {
    const messageText = message.parts.map(p => p.type === 'text' ? p.text : '').join('');
    if (!messageText.trim()) return;

    setMessages((prev) => [...prev, message]);
    setInput("");
    setLoading(true);

    try {
      if (sendToAll) {
        // Modo orquesta: enviar a todos los modelos
        const targetModels = groqModels.filter(
          (m) => m.id !== "openai/gpt-oss-120b"
        );

        const promises = targetModels.map(async (model) => {
          try {
            const simpleMessages = messages.map(msg => ({
              role: msg.role,
              content: msg.parts.map(p => p.type === 'text' ? p.text : '').join('')
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

            // Detectar rate limit error
            const errorMsg = error instanceof Error ? error.message : String(error);
            const isRateLimit = errorMsg.includes('rate_limit') || errorMsg.includes('Rate limit');

            return {
              id: generateUUID(),
              role: "assistant" as const,
              parts: [{
                type: "text" as const,
                text: `**${model.name}:**\n${isRateLimit ? '⏳ Rate limit alcanzado - intenta de nuevo en unos segundos' : `Error: ${errorMsg}`}`
              }],
            };
          }
        });

        const responses = await Promise.all(promises);
        setMessages((prev) => [...prev, ...responses]);

        // Generar resumen con GPT-120B
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
      } else {
        // Modo individual: enviar solo al modelo seleccionado
        const simpleMessages = messages.map(msg => ({
          role: msg.role,
          content: msg.parts.map(p => p.type === 'text' ? p.text : '').join('')
        }));

        const content = await callGroqAI(selectedGroqModel.id, [
          ...simpleMessages,
          { role: "user", content: messageText }
        ]);

        const assistantMessage: ChatMessage = {
          id: generateUUID(),
          role: "assistant",
          parts: [{ type: "text", text: content }],
        };

        setMessages((prev) => [...prev, assistantMessage]);
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
    } finally {
      setLoading(false);
    }
  }, [messages, sendToAll, summarizeAll, selectedGroqModel]);

  const status = loading ? "in_progress" : "ready";

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
          setSendToAll={(checked) => {
            setSendToAll(checked);
            setSummarizeAll(checked);
          }}
          status={status}
          stop={() => {}}
          usage={undefined}
        />
      </div>
    </div>
  );
}
