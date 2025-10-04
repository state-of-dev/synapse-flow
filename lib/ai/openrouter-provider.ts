import type { LanguageModelV1 } from "@ai-sdk/provider";
import { generateId } from "ai";

export function createOpenRouterProvider(apiKey: string) {
  return {
    languageModel(modelId: string): LanguageModelV1 {
      return {
        specificationVersion: "v1",
        provider: "openrouter",
        modelId,
        defaultObjectGenerationMode: "json",

        async doGenerate(options) {
          const response = await fetch(
            "https://openrouter.ai/api/v1/chat/completions",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "http://localhost:3000",
                "X-Title": "AI Chatbot",
              },
              body: JSON.stringify({
                model: modelId,
                messages: options.prompt,
                temperature: options.temperature,
                max_tokens: options.maxTokens,
                top_p: options.topP,
                frequency_penalty: options.frequencyPenalty,
                presence_penalty: options.presencePenalty,
                stream: false,
              }),
            }
          );

          if (!response.ok) {
            throw new Error(
              `OpenRouter API error: ${response.status} ${await response.text()}`
            );
          }

          const data = await response.json();
          const choice = data.choices[0];

          return {
            text: choice.message.content,
            finishReason: choice.finish_reason,
            usage: {
              promptTokens: data.usage?.prompt_tokens ?? 0,
              completionTokens: data.usage?.completion_tokens ?? 0,
            },
            rawResponse: { headers: response.headers },
          };
        },

        async doStream(options) {
          const response = await fetch(
            "https://openrouter.ai/api/v1/chat/completions",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "http://localhost:3000",
                "X-Title": "AI Chatbot",
              },
              body: JSON.stringify({
                model: modelId,
                messages: options.prompt,
                temperature: options.temperature,
                max_tokens: options.maxTokens,
                top_p: options.topP,
                frequency_penalty: options.frequencyPenalty,
                presence_penalty: options.presencePenalty,
                stream: true,
              }),
            }
          );

          if (!response.ok) {
            throw new Error(
              `OpenRouter API error: ${response.status} ${await response.text()}`
            );
          }

          const reader = response.body?.getReader();
          const decoder = new TextDecoder();

          return {
            stream: new ReadableStream({
              async start(controller) {
                if (!reader) {
                  controller.close();
                  return;
                }

                let buffer = "";

                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;

                  buffer += decoder.decode(value, { stream: true });
                  const lines = buffer.split("\n");
                  buffer = lines.pop() ?? "";

                  for (const line of lines) {
                    if (line.startsWith("data: ")) {
                      const data = line.slice(6);
                      if (data === "[DONE]") continue;

                      try {
                        const parsed = JSON.parse(data);
                        const delta = parsed.choices[0]?.delta;

                        if (delta?.content) {
                          controller.enqueue({
                            type: "text-delta",
                            textDelta: delta.content,
                          });
                        }

                        if (parsed.choices[0]?.finish_reason) {
                          controller.enqueue({
                            type: "finish",
                            finishReason: parsed.choices[0].finish_reason,
                            usage: {
                              promptTokens: parsed.usage?.prompt_tokens ?? 0,
                              completionTokens:
                                parsed.usage?.completion_tokens ?? 0,
                            },
                          });
                        }
                      } catch (e) {
                        // Skip invalid JSON
                      }
                    }
                  }
                }

                controller.close();
              },
            }),
            rawCall: { rawPrompt: options.prompt, rawSettings: {} },
          };
        },
      };
    },
  };
}
