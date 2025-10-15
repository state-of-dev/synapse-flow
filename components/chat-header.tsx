"use client";

import { useRouter } from "next/navigation";
import { memo } from "react";
import { useWindowSize } from "usehooks-ts";
import { SidebarToggle } from "@/components/sidebar-toggle";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PlusIcon } from "./icons";
import { useSidebar } from "./ui/sidebar";
import type { VisibilityType } from "./visibility-selector";

function PureChatHeader({
  chatId,
  selectedVisibilityType,
  isReadonly,
}: {
  chatId: string;
  selectedVisibilityType: VisibilityType;
  isReadonly: boolean;
}) {
  const router = useRouter();
  const { open } = useSidebar();

  return (
    <header className="sticky top-0 flex items-center gap-2 bg-background px-2 py-1.5 md:px-2">
      <SidebarToggle />

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            className="order-2 ml-auto h-8 px-2 md:order-1 md:ml-0 md:h-fit md:px-2 md:hidden"
            onClick={() => {
              router.push("/");
              router.refresh();
            }}
            variant="outline"
          >
            <PlusIcon />
            <span className="sr-only">Nuevo Chat</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Nuevo Chat</TooltipContent>
      </Tooltip>
    </header>
  );
}

export const ChatHeader = memo(PureChatHeader, (prevProps, nextProps) => {
  return (
    prevProps.chatId === nextProps.chatId &&
    prevProps.selectedVisibilityType === nextProps.selectedVisibilityType &&
    prevProps.isReadonly === nextProps.isReadonly
  );
});
