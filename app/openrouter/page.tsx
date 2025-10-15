import { OpenRouterChat } from "@/components/openrouter-chat";
import { generateUUID } from "@/lib/utils";

export default async function OpenRouterPage() {
  const id = generateUUID();
  return <OpenRouterChat id={id} key={id} />;
}
