"use client";

import { useRouter } from "next/navigation";
import { memo, useEffect, useState } from "react";
import { useWindowSize } from "usehooks-ts";
import { toast } from "sonner";
import { useCopyToClipboard } from "usehooks-ts";
import { SidebarToggle } from "@/components/sidebar-toggle";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CopyIcon, PlusIcon } from "./icons";
import { useSidebar } from "./ui/sidebar";
import type { VisibilityType } from "./visibility-selector";
import type { ChatMessage } from "@/lib/types";

function PureChatHeader({
  chatId,
  selectedVisibilityType,
  isReadonly,
  messages,
}: {
  chatId: string;
  selectedVisibilityType: VisibilityType;
  isReadonly: boolean;
  messages?: ChatMessage[];
}) {
  const router = useRouter();
  const { open } = useSidebar();
  const [_, copyToClipboard] = useCopyToClipboard();
  const { width: windowWidth } = useWindowSize();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleCopyConversation = async () => {
    if (!messages || messages.length === 0) {
      toast.error("No hay conversación para copiar");
      return;
    }

    const conversationText = messages
      .map((msg) => {
        const role = msg.role === "user" ? "Usuario" : "Asistente";
        const text = msg.parts
          ?.filter((part) => part.type === "text")
          .map((part) => part.text)
          .join("\n") || "";
        return `${role}:\n${text}`;
      })
      .join("\n\n---\n\n");

    await copyToClipboard(conversationText);
    toast.success("Conversación copiada al portapapeles!");
  };

  return (
    <header className="sticky top-0 flex items-center gap-2 bg-background px-2 py-1.5 md:px-2">
      <SidebarToggle />

      {isMounted && (!open || windowWidth < 768) && (
        <Button
          className="h-8 px-2 md:h-fit md:px-2"
          onClick={() => {
            router.push("/");
            router.refresh();
          }}
          variant="outline"
        >
          <PlusIcon />
          <span className="sr-only">Nuevo Chat</span>
        </Button>
      )}

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            className="ml-auto h-8 px-2"
            onClick={handleCopyConversation}
            variant="ghost"
            disabled={!messages || messages.length === 0}
          >
            <CopyIcon size={16} />
            <span className="sr-only">Copiar conversación</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Copiar conversación</TooltipContent>
      </Tooltip>
    </header>
  );
}

export const ChatHeader = memo(PureChatHeader, (prevProps, nextProps) => {
  return (
    prevProps.chatId === nextProps.chatId &&
    prevProps.selectedVisibilityType === nextProps.selectedVisibilityType &&
    prevProps.isReadonly === nextProps.isReadonly &&
    prevProps.messages?.length === nextProps.messages?.length
  );
});
