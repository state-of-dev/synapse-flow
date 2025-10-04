import type { LanguageModelV2 } from "@ai-sdk/provider";
import { generateId } from "ai";

// Supported URL patterns for the provider (top-level to avoid recreating RegExp repeatedly)
const OPENROUTER_SUPPORTED_URLS: Record<string, RegExp[]> = {
  openrouter: [/https:\/\/openrouter\.ai\/.*/],
};

export function createOpenRouterProvider(apiKey: string) {
  return {
    languageModel(modelId: string): LanguageModelV2 {
      return {
        specificationVersion: "v2",
        provider: "openrouter",
        modelId,
        // Indicate which URLs this provider supports (required by the type)
        supportedUrls: OPENROUTER_SUPPORTED_URLS,

        async doGenerate(options: any) {
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
            rawCall: { rawPrompt: options.prompt ?? null, rawSettings: {} },
            finishReason: choice.finish_reason,
            usage: {
              inputTokens: data.usage?.prompt_tokens ?? 0,
              outputTokens: data.usage?.completion_tokens ?? 0,
              totalTokens:
                (data.usage?.prompt_tokens ?? 0) +
                (data.usage?.completion_tokens ?? 0),
            },
            content: [{ type: "text", text: choice.message.content }],
            warnings: [],
          };
        },

        async doStream(options: any) {
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
                const streamId = generateId();

                while (true) {
                  const { done, value } = await reader.read();
                  if (done) {
                    break;
                  }

                  buffer += decoder.decode(value, { stream: true });
                  const lines = buffer.split("\n");
                  buffer = lines.pop() ?? "";

                  for (const line of lines) {
                    if (line.startsWith("data: ")) {
                      const data = line.slice(6);
                      if (data === "[DONE]") {
                        continue;
                      }

                      try {
                        const parsed = JSON.parse(data);
                        const delta = parsed.choices[0]?.delta;

                        if (delta?.content) {
                          controller.enqueue({
                            id: streamId,
                            type: "text-delta",
                            delta: delta.content,
                          });
                        }

                        if (parsed.choices[0]?.finish_reason) {
                          controller.enqueue({
                            type: "finish",
                            finishReason: parsed.choices[0].finish_reason,
                            usage: {
                              inputTokens: parsed.usage?.prompt_tokens ?? 0,
                              outputTokens:
                                parsed.usage?.completion_tokens ?? 0,
                              totalTokens:
                                (parsed.usage?.prompt_tokens ?? 0) +
                                (parsed.usage?.completion_tokens ?? 0),
                            },
                          });
                        }
                      } catch (_err) {
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
