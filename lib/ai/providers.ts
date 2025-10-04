import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from "ai";
import { isTestEnvironment } from "../constants";
import { createOpenRouterProvider } from "./openrouter-provider";

const openrouter = createOpenRouterProvider(
  process.env.OPENROUTER_API_KEY ?? ""
);

export const myProvider = isTestEnvironment
  ? (() => {
      const {
        artifactModel,
        chatModel,
        reasoningModel,
        titleModel,
      } = require("./models.mock");
      return customProvider({
        languageModels: {
          "chat-model": chatModel,
          "chat-model-reasoning": reasoningModel,
          "title-model": titleModel,
          "artifact-model": artifactModel,
        },
      });
    })()
  : customProvider({
      languageModels: {
        // DeepSeek - Most capable free model
        "deepseek-chat": openrouter("deepseek/deepseek-chat-v3.1:free"),
        "deepseek-reasoning": wrapLanguageModel({
          model: openrouter("deepseek/deepseek-chat-v3.1:free"),
          middleware: extractReasoningMiddleware({ tagName: "think" }),
        }),

        // Meta Llama 4 - Latest and most powerful
        "llama-4-maverick": openrouter("meta-llama/llama-4-maverick:free"),

        // Meta Llama 3.3 - Powerful 70B model
        "llama-3.3-70b": openrouter("meta-llama/llama-3.3-70b-instruct"),

        // Mistral - Fast and efficient
        "mistral-small": openrouter("mistralai/mistral-small-3.1-24b-instruct:free"),

        // Qwen - Strong reasoning
        "qwen-2.5-7b": openrouter("qwen/qwen-2.5-7b-instruct"),

        // Default aliases for backward compatibility
        "chat-model": openrouter("deepseek/deepseek-chat-v3.1:free"),
        "chat-model-reasoning": wrapLanguageModel({
          model: openrouter("deepseek/deepseek-chat-v3.1:free"),
          middleware: extractReasoningMiddleware({ tagName: "think" }),
        }),
        "title-model": openrouter("deepseek/deepseek-chat-v3.1:free"),
        "artifact-model": openrouter("deepseek/deepseek-chat-v3.1:free"),
      },
    });
