import { redirect } from "next/navigation";
import { SimpleOrchestratorChat } from "@/components/simple-orchestrator-chat";
import { generateUUID } from "@/lib/utils";
import { auth } from "../(auth)/auth";

export default async function Page() {
  const session = await auth();

  if (!session) {
    redirect("/api/auth/guest");
  }

  const id = generateUUID();

  return <SimpleOrchestratorChat id={id} key={id} />;
}
