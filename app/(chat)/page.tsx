import { SimpleOrchestratorChat } from "@/components/simple-orchestrator-chat";
import { generateUUID } from "@/lib/utils";

export default async function Page() {
  const id = generateUUID();
  return <SimpleOrchestratorChat id={id} key={id} />;
}
