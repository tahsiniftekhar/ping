"use client";

import { MessageSquarePlus, SearchX } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import {
  conversationTimestamp,
  conversationTitle,
  lastMessagePreview,
} from "@/features/conversations/helpers";
import type { Conversation } from "@/types/api";
import { Avatar, GroupAvatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function ConversationListSkeleton() {
  return (
    <div className="flex flex-col gap-1 p-2" aria-hidden>
      {Array.from({ length: 7 }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 rounded-2xl px-3 py-2.5">
          <div className="size-10 shrink-0 animate-pulse rounded-full bg-muted" />
          <div className="flex flex-1 flex-col gap-2">
            <div className="h-3 w-2/5 animate-pulse rounded bg-muted" />
            <div className="h-2.5 w-4/5 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

interface ConversationListProps {
  conversations: Conversation[];
  /** True when conversations exist but the search/filter hides all of them. */
  filtered: boolean;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  onRetry: () => void;
  onNewChat: () => void;
  selectedId: string | null;
  onSelect: (conversationId: string) => void;
  currentUserId: string;
  unreadIds: ReadonlySet<string>;
}

export function ConversationList({
  conversations,
  filtered,
  isPending,
  isError,
  error,
  onRetry,
  onNewChat,
  selectedId,
  onSelect,
  currentUserId,
  unreadIds,
}: ConversationListProps) {
  if (isPending) return <ConversationListSkeleton />;

  if (isError) {
    const message =
      error instanceof ApiError ? error.message : "Could not load conversations. Please try again.";
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-xs text-destructive">{message}</p>
        <Button variant="outline" size="sm" onClick={onRetry} className="h-8 rounded-full text-xs">
          Retry
        </Button>
      </div>
    );
  }

  if (conversations.length === 0) {
    if (filtered) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
          <SearchX className="size-5 text-subtle" aria-hidden />
          <p className="text-xs font-semibold text-foreground">No matching conversations</p>
          <p className="text-[11px] text-subtle">Try another name, or clear the filter.</p>
        </div>
      );
    }
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <span className="flex size-11 items-center justify-center rounded-2xl bg-brand/10 text-brand">
          <MessageSquarePlus className="size-5" aria-hidden />
        </span>
        <div>
          <p className="text-sm font-semibold text-foreground">No conversations yet</p>
          <p className="mt-1 text-xs text-subtle">Find someone by name to start chatting.</p>
        </div>
        <Button
          size="sm"
          onClick={onNewChat}
          className="h-8 rounded-full bg-foreground px-4 text-xs text-background hover:bg-foreground/90"
        >
          Start a conversation
        </Button>
      </div>
    );
  }

  return (
    <ul className="scrollbar-thin flex flex-1 flex-col gap-0.5 overflow-y-auto p-2" aria-label="Conversations">
      {conversations.map((conversation) => {
        const title = conversationTitle(conversation);
        const preview = lastMessagePreview(conversation, currentUserId);
        const timestamp = conversationTimestamp(conversation);
        const selected = conversation._id === selectedId;
        const unread = !selected && unreadIds.has(conversation._id);
        return (
          <li key={conversation._id}>
            <button
              type="button"
              onClick={() => onSelect(conversation._id)}
              aria-current={selected ? "page" : undefined}
              aria-label={unread ? `${title}, unread messages` : title}
              className={cn(
                "group flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
                selected ? "bg-foreground/[0.07]" : "hover:bg-foreground/[0.04]",
              )}
            >
              {conversation.type === "group" ? (
                <GroupAvatar
                  members={conversation.participants.filter((p) => p._id !== currentUserId)}
                  seed={conversation._id}
                />
              ) : (
                <Avatar name={title} seed={conversation.participant._id} />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span
                    className={cn(
                      "truncate text-[13px] text-foreground",
                      unread ? "font-bold" : "font-semibold",
                    )}
                  >
                    {title}
                  </span>
                  {timestamp && (
                    <span
                      className={cn(
                        "shrink-0 text-[10px] tabular-nums",
                        unread ? "font-semibold text-brand" : "text-subtle",
                      )}
                    >
                      {timestamp}
                    </span>
                  )}
                </div>
                <div className="mt-0.5 flex items-center gap-2">
                  <span
                    className={cn(
                      "block flex-1 truncate text-xs",
                      unread ? "font-medium text-foreground" : "text-muted-foreground",
                      !conversation.lastMessage.text && "italic text-subtle",
                    )}
                  >
                    {preview}
                  </span>
                  {unread && <span className="size-2 shrink-0 rounded-full bg-brand" aria-hidden />}
                </div>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
