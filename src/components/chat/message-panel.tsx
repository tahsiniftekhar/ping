"use client";

import { useEffect, useRef } from "react";
import { conversationTitle } from "@/features/conversations/helpers";
import { chronologicMessages, useMessageHistory } from "@/features/messages/queries";
import { messageTimeLabel } from "@/features/messages/helpers";
import { ApiError } from "@/lib/api/client";
import type { Conversation, Message } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Distance from the top (px) that triggers loading older messages. */
const LOAD_OLDER_THRESHOLD = 60;

function MessageBubble({
  message,
  outgoing,
  senderName,
  showSender,
}: {
  message: Message;
  outgoing: boolean;
  senderName: string | null;
  showSender: boolean;
}) {
  return (
    <div className={`flex flex-col ${outgoing ? "items-end" : "items-start"}`}>
      {showSender && senderName && !outgoing && (
        <span className="text-muted-foreground mb-0.5 ml-1 text-xs">{senderName}</span>
      )}
      <div
        className={`max-w-[85%] rounded-2xl px-3 py-2 sm:max-w-md ${
          outgoing
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-muted rounded-bl-sm"
        }`}
      >
        <p className="text-sm whitespace-pre-wrap break-words">{message.text}</p>
        <span
          className={`mt-0.5 block text-right text-[10px] ${
            outgoing ? "text-primary-foreground/70" : "text-muted-foreground"
          }`}
        >
          {messageTimeLabel(message.createdAt)}
        </span>
      </div>
    </div>
  );
}

export function MessagePanel({
  conversation,
  currentUserId,
}: {
  conversation: Conversation;
  currentUserId: string;
}) {
  const {
    data,
    isPending,
    isError,
    error,
    refetch,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useMessageHistory(conversation._id);

  const scrollRef = useRef<HTMLDivElement>(null);
  // scrollHeight captured before older messages are prepended, to anchor restore.
  const previousScrollHeight = useRef<number | null>(null);
  const pageCount = data?.pages.length ?? 0;

  // Initial load and conversation switches land at the bottom (latest messages).
  // Re-runs when the load finishes (isPending flips) or a different conversation
  // is selected; loading older pages does not touch either dep.
  useEffect(() => {
    const container = scrollRef.current;
    if (!isPending && container) container.scrollTop = container.scrollHeight;
  }, [isPending, conversation._id]);

  // After prepending a page, restore the user's visual position.
  useEffect(() => {
    const container = scrollRef.current;
    if (container && previousScrollHeight.current !== null) {
      container.scrollTop = container.scrollHeight - previousScrollHeight.current;
      previousScrollHeight.current = null;
    }
  }, [pageCount]);

  const messages = data ? chronologicMessages(data.pages) : [];

  function handleScroll(event: React.UIEvent<HTMLDivElement>) {
    const container = event.currentTarget;
    if (
      container.scrollTop <= LOAD_OLDER_THRESHOLD &&
      hasNextPage &&
      !isFetchingNextPage &&
      previousScrollHeight.current === null
    ) {
      previousScrollHeight.current = container.scrollHeight;
      void fetchNextPage();
    }
  }

  const subtitle =
    conversation.type === "direct"
      ? conversation.participant.phone
      : `${conversation.participants.length} members`;

  // Group sender names looked up from participants (direct chats don't need it).
  const senderNames = new Map<string, string>();
  if (conversation.type === "group") {
    for (const participant of conversation.participants) {
      senderNames.set(participant._id, participant.name);
    }
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <header className="flex min-h-14 items-center gap-3 border-b px-4 py-2">
        <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
          {conversation.type === "group" ? (
            <span aria-hidden>👥</span>
          ) : (
            conversationTitle(conversation).charAt(0).toUpperCase()
          )}
        </div>
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold">{conversationTitle(conversation)}</h2>
          <p className="text-muted-foreground truncate text-xs">{subtitle}</p>
        </div>
      </header>

      <div className="relative min-h-0 flex-1">
        {isPending ? (
          <div className="flex h-full flex-col justify-end gap-2 p-4" aria-label="Loading messages">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className={`bg-muted h-10 w-1/3 animate-pulse rounded-2xl ${
                  index % 2 === 0 ? "self-start" : "self-end"
                }`}
              />
            ))}
          </div>
        ) : isError ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="text-destructive text-sm">
              {error instanceof ApiError
                ? error.message
                : "Could not load messages. Please try again."}
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-1 p-6 text-center">
            <p className="text-sm font-medium">No messages yet</p>
            <p className="text-muted-foreground text-xs">
              This conversation has no history — say hello when sending is built.
            </p>
          </div>
        ) : (
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex h-full flex-col gap-2 overflow-y-auto p-4"
            aria-label="Message history"
          >
            {isFetchingNextPage && (
              <p className="text-muted-foreground animate-pulse py-1 text-center text-xs">
                Loading older messages…
              </p>
            )}
            {messages.map((message) => {
              const outgoing = message.sender === currentUserId;
              return (
                <MessageBubble
                  key={message._id}
                  message={message}
                  outgoing={outgoing}
                  senderName={senderNames.get(message.sender) ?? "Unknown"}
                  showSender={conversation.type === "group"}
                />
              );
            })}
          </div>
        )}
      </div>

      <footer className="border-t p-3">
        <form className="flex gap-2" onSubmit={(event) => event.preventDefault()}>
          <Input placeholder="Messages can't be sent yet" disabled aria-label="Message input" />
          <Button type="submit" disabled>
            Send
          </Button>
        </form>
      </footer>
    </section>
  );
}
