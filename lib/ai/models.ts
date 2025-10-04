export const DEFAULT_CHAT_MODEL: string = "deepseek-chat";

export type ChatModel = {
  id: string;
  name: string;
  description: string;
};

export const chatModels: ChatModel[] = [
  // DeepSeek - Most capable free model
  {
    id: "deepseek-chat",
    name: "DeepSeek Chat V3.1",
    description: "Most capable free model - excellent for coding, reasoning, and general tasks",
  },
  {
    id: "deepseek-reasoning",
    name: "DeepSeek Reasoning",
    description: "DeepSeek with advanced chain-of-thought reasoning for complex problems",
  },

  // Meta Llama 4 - Latest and most powerful
  {
    id: "llama-4-maverick",
    name: "Llama 4 Maverick",
    description: "Meta's latest Llama 4 model - 400B parameters, cutting-edge performance",
  },

  // Meta Llama 3.3 - Powerful
  {
    id: "llama-3.3-70b",
    name: "Llama 3.3 70B",
    description: "Powerful 70B model - great for complex reasoning and long contexts",
  },

  // Mistral - Fast and efficient
  {
    id: "mistral-small",
    name: "Mistral Small 24B",
    description: "Fast and efficient 24B model from Mistral AI",
  },

  // Qwen - Strong reasoning
  {
    id: "qwen-2.5-7b",
    name: "Qwen 2.5 7B",
    description: "Strong reasoning and multilingual capabilities",
  },
];
