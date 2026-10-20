import { ConversationAvatar } from "@/components/chat/message-header";
import { Button } from "@/components/ui/button";
import { conversationTitle } from "@/features/conversations/helpers";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import type { Conversation } from "@/types/api";

export function MessageSkeleton() {
  return (
    <div className="flex h-full flex-col justify-end gap-3 p-5" aria-label="Loading messages" role="status">
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className={cn(
            "h-10 animate-pulse rounded-2xl bg-muted",
            index % 2 === 0 ? "w-1/3 self-start" : "w-2/5 self-end",
          )}
        />
      ))}
    </div>
  );
}

export function MessageError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-sm text-destructive">
        {error instanceof ApiError ? error.message : "Could not load messages. Please try again."}
      </p>
      <Button variant="outline" size="sm" className="rounded-full" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}

export function MessageEmptyState({ conversation }: { conversation: Conversation }) {
  const title = conversationTitle(conversation);
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
      <ConversationAvatar conversation={conversation} size="lg" />
      <div className="space-y-1">
        <p className="text-sm font-bold text-foreground">
          {conversation.type === "group" ? `This is the beginning of ${title}` : `Say hello to ${title}`}
        </p>
        <p className="text-xs text-subtle">No messages yet. Send the first one below.</p>
      </div>
    </div>
  );
}
