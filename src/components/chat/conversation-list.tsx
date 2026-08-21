"use client";

import { ApiError } from "@/lib/api/client";
import {
  conversationTimestamp,
  conversationTitle,
  lastMessagePreview,
} from "@/features/conversations/helpers";
import type { Conversation } from "@/types/api";
import { Button } from "@/components/ui/button";

function ConversationListSkeleton() {
  return (
    <div className="flex flex-col gap-1 p-2" aria-hidden>
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="flex flex-col gap-2 rounded-md p-3">
          <div className="bg-muted h-4 w-1/2 animate-pulse rounded" />
          <div className="bg-muted h-3 w-3/4 animate-pulse rounded" />
        </div>
      ))}
    </div>
  );
}

interface ConversationListProps {
  conversations: Conversation[];
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  onRetry: () => void;
  selectedId: string | null;
  onSelect: (conversationId: string) => void;
  currentUserId: string;
}

export function ConversationList({
  conversations,
  isPending,
  isError,
  error,
  onRetry,
  selectedId,
  onSelect,
  currentUserId,
}: ConversationListProps) {
  if (isPending) {
    return (
      <div className="flex flex-1 flex-col">
        <ConversationListSkeleton />
      </div>
    );
  }

  if (isError) {
    const message =
      error instanceof ApiError
        ? error.message
        : "Could not load conversations. Please try again.";
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-destructive text-sm">{message}</p>
        <Button variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-1 p-6 text-center">
        <p className="text-sm font-medium">No conversations yet</p>
        <p className="text-muted-foreground text-xs">
          Search for someone to start your first chat.
        </p>
      </div>
    );
  }

  return (
    <ul className="flex flex-1 flex-col overflow-y-auto p-2">
      {conversations.map((conversation) => {
        const title = conversationTitle(conversation);
        const preview = lastMessagePreview(conversation.lastMessage, currentUserId);
        const timestamp = conversationTimestamp(conversation);
        const selected = conversation._id === selectedId;
        return (
          <li key={conversation._id}>
            <button
              type="button"
              onClick={() => onSelect(conversation._id)}
              aria-current={selected ? "true" : undefined}
              className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                selected ? "bg-muted" : "hover:bg-muted/50"
              }`}
            >
              <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
                {conversation.type === "group" ? (
                  <span aria-hidden>👥</span>
                ) : (
                  title.charAt(0).toUpperCase()
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-medium">{title}</span>
                  {timestamp && (
                    <span className="text-muted-foreground shrink-0 text-xs">{timestamp}</span>
                  )}
                </div>
                <span className="text-muted-foreground block truncate text-xs">{preview}</span>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
