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
    <div className="flex flex-col gap-1.5 p-3" aria-hidden>
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 rounded-[14px] p-2.5">
          <div className="size-10 rounded-full bg-[#EAEAE7] animate-pulse shrink-0" />
          <div className="flex flex-1 flex-col gap-1.5">
            <div className="bg-[#EAEAE7] h-3.5 w-1/2 animate-pulse rounded" />
            <div className="bg-[#EAEAE7] h-2.5 w-3/4 animate-pulse rounded" />
          </div>
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
        <p className="text-xs text-red-600">{message}</p>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onRetry}
          className="h-8 rounded-full border-[#171717]/10 text-xs"
        >
          Retry
        </Button>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-1.5 p-6 text-center">
        <p className="text-xs font-bold text-[#171717]">No conversations yet</p>
        <p className="text-[11px] text-[#8A8A86]">
          Search for someone to start your first chat.
        </p>
      </div>
    );
  }

  return (
    <ul className="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
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
              className={`flex w-full items-center gap-3 rounded-[14px] px-3 py-2.5 text-left transition-colors outline-none focus-visible:ring-1 focus-visible:ring-[#2878F0] ${
                selected ? "bg-[#171717]/[0.08]" : "hover:bg-[#171717]/[0.04]"
              }`}
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#EAEAE7] text-xs font-bold text-[#171717] border border-[#171717]/[0.06]">
                {conversation.type === "group" ? (
                  <span aria-hidden>👥</span>
                ) : (
                  title.charAt(0).toUpperCase()
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-xs font-bold text-[#171717]">{title}</span>
                  {timestamp && (
                    <span className="font-mono text-[10px] text-[#8A8A86] shrink-0">{timestamp}</span>
                  )}
                </div>
                <span className="block truncate text-xs text-[#626262] mt-0.5">{preview}</span>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
