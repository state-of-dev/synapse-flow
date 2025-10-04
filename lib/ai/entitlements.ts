import type { UserType } from "@/app/(auth)/auth";
import type { ChatModel } from "./models";

type Entitlements = {
  maxMessagesPerDay: number;
  availableChatModelIds: ChatModel["id"][];
};

export const entitlementsByUserType: Record<UserType, Entitlements> = {
  /*
   * For users without an account
   */
  guest: {
    maxMessagesPerDay: 20,
    availableChatModelIds: [
      "deepseek-chat",
      "deepseek-reasoning",
      "llama-4-maverick",
      "llama-3.3-70b",
      "mistral-small",
      "qwen-2.5-7b",
    ],
  },

  /*
   * For users with an account
   */
  regular: {
    maxMessagesPerDay: 100,
    availableChatModelIds: [
      "deepseek-chat",
      "deepseek-reasoning",
      "llama-4-maverick",
      "llama-3.3-70b",
      "mistral-small",
      "qwen-2.5-7b",
    ],
  },

  /*
   * TODO: For users with an account and a paid membership
   */
};
