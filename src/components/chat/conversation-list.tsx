"use client";

import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/providers/auth-provider";
import {
  conversationTimestamp,
  conversationTitle,
  lastMessagePreview,
} from "@/features/conversations/helpers";
import { useConversations } from "@/features/conversations/queries";
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

export function ConversationList() {
  const { user } = useAuth();
  const { data, isPending, isError, error, refetch } = useConversations();

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
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  const conversations = data.data;

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

  if (!user) return null;

  return (
    <ul className="flex flex-1 flex-col overflow-y-auto p-2">
      {conversations.map((conversation) => {
        const title = conversationTitle(conversation);
        const preview = lastMessagePreview(conversation.lastMessage, user._id);
        const timestamp = conversationTimestamp(conversation);
        return (
          <li key={conversation._id}>
            <button
              type="button"
              className="hover:bg-muted flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
