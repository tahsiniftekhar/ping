"use client";

import { useState } from "react";
import { MessageSquarePlus } from "lucide-react";
import { useStartDirectConversation } from "@/features/conversations/queries";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { dialogContentClass, errorMessage, UserSearch } from "./user-search";

interface NewConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConversationOpened: (conversationId: string) => void;
}

export function NewConversationDialog({
  open,
  onOpenChange,
  onConversationOpened,
}: NewConversationDialogProps) {
  const [searchInput, setSearchInput] = useState("");
  const startConversation = useStartDirectConversation();
  const creating = startConversation.isPending;

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) setSearchInput("");
    onOpenChange(nextOpen);
  }

  async function handleSelect(userId: string) {
    try {
      const conversation = await startConversation.mutateAsync(userId);
      handleOpenChange(false);
      onConversationOpened(conversation._id);
    } catch {
      // Mutation error is rendered below; dialog stays open for retry.
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={dialogContentClass}>
        <DialogHeader className="flex-row items-center gap-3 pr-8">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
            <MessageSquarePlus aria-hidden className="size-5" />
          </span>
          <div className="min-w-0">
            <DialogTitle className="text-lg font-bold tracking-tight text-foreground">
              New conversation
            </DialogTitle>
            <DialogDescription className="mt-1 text-xs text-muted-foreground">
              Search by name to start a direct chat.
            </DialogDescription>
          </div>
        </DialogHeader>

        <UserSearch
          autoFocus
          query={searchInput}
          onQueryChange={setSearchInput}
          onSelect={(user) => void handleSelect(user._id)}
          pendingId={creating ? (startConversation.variables ?? null) : null}
          disabled={creating}
        />

        {startConversation.isError && (
          <p role="alert" className="px-1 text-xs text-destructive">
            {errorMessage(startConversation.error, "Could not open the conversation. Please try again.")}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
