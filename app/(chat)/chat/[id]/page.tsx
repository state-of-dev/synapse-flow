import { notFound } from "next/navigation";
import { SimpleOrchestratorChat } from "@/components/simple-orchestrator-chat";
import { getChatById, getMessagesByChatId } from "@/lib/db/queries";
import { convertToUIMessages } from "@/lib/utils";

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;
  const chat = await getChatById({ id });

  if (!chat) {
    notFound();
  }

  const messagesFromDb = await getMessagesByChatId({
    id,
  });

  const uiMessages = convertToUIMessages(messagesFromDb);

  return <SimpleOrchestratorChat id={chat.id} initialMessages={uiMessages} key={chat.id} />;
}
