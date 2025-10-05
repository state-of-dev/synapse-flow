import { notFound } from "next/navigation";
import { SimpleOrchestratorChat } from "@/components/simple-orchestrator-chat";
import { getChatById, getMessagesByChatId } from "@/lib/db/queries";
import { convertToUIMessages } from "@/lib/utils";

interface PageProps {
  params: { id: string };
  searchParams?: { [key: string]: string | string[] | undefined };
}

export default async function Page({ params: paramsPromise }: { params: Promise<PageProps['params']> }) {
  try {
    const params = await paramsPromise;
    const id = params?.id;

    if (!id) {
      notFound();
    }

    // Cargar el chat y sus mensajes en paralelo
    const [chat, messagesFromDb] = await Promise.all([
      getChatById({ id }),
      getMessagesByChatId({ id })
    ]);

    if (!chat) {
      notFound();
    }

    const uiMessages = convertToUIMessages(messagesFromDb);

    return (
      <SimpleOrchestratorChat
        id={chat.id}
        initialMessages={uiMessages}
        key={chat.id}
      />
    );
  } catch (error) {
    console.error('[SERVER] Error cargando chat:', error);
    notFound();
  }
}
