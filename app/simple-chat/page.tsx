"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import remarkGfm from "remark-gfm";
import { ChevronDownIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// GROQ API key is loaded server-side in the `/api/groq` route. Do not expose it to the client.

const models = [
  { id: "openai/gpt-oss-120b", name: "GPT-OSS 120B" },
  { id: "deepseek-r1-distill-llama-70b", name: "DeepSeek R1 70B" },
  { id: "qwen/qwen3-32b", name: "Qwen3 32B" },
  { id: "gemma2-9b-it", name: "Gemma 2 9B" },
  { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B" },
  { id: "moonshotai/kimi-k2-instruct", name: "Kimi K2" },
];

async function callAI(
  modelId: string,
  messages: Array<{ role: string; content: string; model?: string }>
) {
  // Proxy the request through an internal API route so the API key stays server-side.
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

interface Chat {
  id: string;
  title: string;
  messages: Array<{ role: string; content: string }>;
}

export default function SimpleChat() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<
    Array<{ role: string; content: string; model?: string }>
  >([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState(models[0]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sendToAll, setSendToAll] = useState(false);
  const [summarizeAll, setSummarizeAll] = useState(false);

  // Cargar chats del localStorage
  useEffect(() => {
    const savedChats = localStorage.getItem("simple-chats");
    if (savedChats) {
      setChats(JSON.parse(savedChats));
    }
  }, []);

  // Guardar chat actual
  useEffect(() => {
    if (currentChatId && messages.length > 0) {
      const chatTitle =
        messages[0]?.content.slice(0, 50) || "Nueva conversación";
      const updatedChats = chats.filter((c) => c.id !== currentChatId);
      updatedChats.unshift({
        id: currentChatId,
        title: chatTitle,
        messages,
      });
      setChats(updatedChats);
      localStorage.setItem("simple-chats", JSON.stringify(updatedChats));
    }
  }, [messages, currentChatId]);

  const startNewChat = () => {
    setCurrentChatId(Date.now().toString());
    setMessages([]);
  };

  const loadChat = (chat: Chat) => {
    setCurrentChatId(chat.id);
    setMessages(chat.messages);
  };

  const deleteChat = (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedChats = chats.filter((c) => c.id !== chatId);
    setChats(updatedChats);
    localStorage.setItem("simple-chats", JSON.stringify(updatedChats));

    if (currentChatId === chatId) {
      setCurrentChatId(null);
      setMessages([]);
    }
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    if (!currentChatId) {
      setCurrentChatId(Date.now().toString());
    }

    const userMessage = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      if (sendToAll) {
        // Enviar a todos los modelos en paralelo (excluyendo GPT-OSS; ese se usa solo para el resumen)
        const targetModels = models.filter(
          (m) => m.id !== "openai/gpt-oss-120b"
        );
        const promises = targetModels.map(async (model) => {
          try {
            const content = await callAI(model.id, [...messages, userMessage]);
            return {
              role: "assistant",
              content,
              model: model.name,
            };
          } catch (error) {
            console.error(`Error with ${model.name}:`, error);
            return {
              role: "assistant",
              content: `Error al obtener respuesta de ${model.name}: ${error instanceof Error ? error.message : "Unknown error"}`,
              model: model.name,
            };
          }
        });

        const responses = await Promise.all(promises);
        setMessages((prev) => [...prev, ...responses]);

        // Si summarizeAll está activado, crear resumen con Llama
        if (summarizeAll) {
          try {
            const concatenatedResponses = responses
              .map((r) => `**${r.model}:**\n${r.content}`)
              .join("\n\n---\n\n");

            const summaryContent = await callAI("openai/gpt-oss-120b", [
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

            setMessages((prev) => [
              ...prev,
              {
                role: "assistant",
                content: summaryContent,
                model: "📝 Resumen (GPT-OSS 120B)",
              },
            ]);
          } catch (error) {
            console.error("Error creating summary:", error);
          }
        }
      } else {
        // Enviar solo al modelo seleccionado
        const content = await callAI(selectedModel.id, [
          ...messages,
          userMessage,
        ]);

        const assistantMessage = {
          role: "assistant",
          content,
          model: selectedModel.name,
        };

        setMessages((prev) => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error("Error:", error);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Error al enviar mensaje" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      {sidebarOpen && (
        <div className="flex w-64 flex-col border-r bg-muted/50">
          <div className="border-b p-4">
            <Button className="w-full" onClick={startNewChat}>
              + Nueva conversación
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {chats.map((chat) => (
              <div
                className={`flex w-full items-center justify-between border-b p-3 hover:bg-muted ${
                  currentChatId === chat.id ? "bg-muted" : ""
                }`}
                key={chat.id}
              >
                <button
                  className="flex-1 truncate text-left text-sm"
                  onClick={() => loadChat(chat)}
                >
                  {chat.title}
                </button>
                <button
                  className="ml-2 rounded p-1 text-destructive hover:bg-destructive/10"
                  onClick={(e) => deleteChat(chat.id, e)}
                  title="Eliminar conversación"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Chat */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 border-b bg-background">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                size="sm"
                variant="ghost"
              >
                ☰
              </Button>
              <h1 className="font-semibold text-xl">Chat</h1>
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  checked={sendToAll}
                  className="rounded"
                  onChange={(e) => setSendToAll(e.target.checked)}
                  type="checkbox"
                />
                Enviar a todos
              </label>
              {sendToAll && (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    checked={summarizeAll}
                    className="rounded"
                    onChange={(e) => setSummarizeAll(e.target.checked)}
                    type="checkbox"
                  />
                  + Resumen
                </label>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    className="gap-2"
                    disabled={sendToAll}
                    variant="outline"
                  >
                    {selectedModel.name}
                    <ChevronDownIcon />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[280px]">
                  {models.map((model) => (
                    <DropdownMenuItem
                      className="cursor-pointer"
                      key={model.id}
                      onSelect={() => setSelectedModel(model)}
                    >
                      <div className="flex flex-col">
                        <div className="font-medium text-sm">{model.name}</div>
                        <div className="text-muted-foreground text-xs">
                          {model.id}
                        </div>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {messages.length === 0 && (
            <div className="mt-8 text-center text-muted-foreground">
              Envía un mensaje para comenzar
            </div>
          )}
          {messages.map((msg, i) => (
            <div
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              key={i}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                {msg.model && (
                  <div className="mb-2 font-semibold text-xs opacity-70">
                    {msg.model}
                  </div>
                )}
                {msg.role === "assistant" ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown
                      components={{
                        code({
                          node,
                          inline,
                          className,
                          children,
                          ...props
                        }: any) {
                          const match = /language-(\w+)/.exec(className || "");
                          return !inline && match ? (
                            <SyntaxHighlighter
                              language={match[1]}
                              PreTag="div"
                              style={oneDark}
                              {...props}
                            >
                              {String(children).replace(/\n$/, "")}
                            </SyntaxHighlighter>
                          ) : (
                            <code className={className} {...props}>
                              {children}
                            </code>
                          );
                        },
                      }}
                      remarkPlugins={[remarkGfm]}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-lg bg-muted p-3">
                <div className="flex gap-1">
                  <div
                    className="h-2 w-2 animate-bounce rounded-full bg-current"
                    style={{ animationDelay: "0ms" }}
                  />
                  <div
                    className="h-2 w-2 animate-bounce rounded-full bg-current"
                    style={{ animationDelay: "150ms" }}
                  />
                  <div
                    className="h-2 w-2 animate-bounce rounded-full bg-current"
                    style={{ animationDelay: "300ms" }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t p-4">
          <div className="mx-auto flex max-w-4xl gap-2">
            <input
              className="flex-1 rounded-lg border p-3 focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={loading}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && !loading && sendMessage()}
              placeholder="Escribe un mensaje..."
              type="text"
              value={input}
            />
            <Button className="px-6" disabled={loading} onClick={sendMessage}>
              Enviar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
