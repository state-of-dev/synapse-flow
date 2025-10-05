import Link from "next/link";
import { memo } from "react";
import type { Chat } from "@/lib/db/schema";
import { TrashIcon } from "./icons";
import {
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "./ui/sidebar";

const PureChatItem = ({
  chat,
  isActive,
  onDelete,
  setOpenMobile,
}: {
  chat: Chat;
  isActive: boolean;
  onDelete: (chatId: string) => void;
  setOpenMobile: (open: boolean) => void;
}) => {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActive}>
        <Link href={`/chat/${chat.id}`} onClick={() => setOpenMobile(false)}>
          <span>{chat.title}</span>
        </Link>
      </SidebarMenuButton>

      <SidebarMenuAction
        className="mr-0.5 text-destructive hover:bg-destructive/15 hover:text-destructive dark:text-red-500"
        showOnHover={!isActive}
        onClick={() => onDelete(chat.id)}
      >
        <TrashIcon />
        <span className="sr-only">Eliminar</span>
      </SidebarMenuAction>
    </SidebarMenuItem>
  );
};

export const ChatItem = memo(PureChatItem, (prevProps, nextProps) => {
  if (prevProps.isActive !== nextProps.isActive) {
    return false;
  }
  return true;
});
