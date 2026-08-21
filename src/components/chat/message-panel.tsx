"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { conversationTitle } from "@/features/conversations/helpers";
import { GroupDetailsDialog } from "@/components/chat/group-details-dialog";
import { chronologicMessages, messageKeys, useMessageHistory } from "@/features/messages/queries";
import { messageTimeLabel } from "@/features/messages/helpers";
import { useSendMessage, type PendingMessage } from "@/features/messages/use-send-message";
import { useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/lib/api/client";
import type { Conversation, Message } from "@/types/api";
import { Button } from "@/components/ui/button";

/** Distance from the top (px) that triggers loading older messages. */
const LOAD_OLDER_THRESHOLD = 60;
/** Distance from the bottom (px) within which new messages auto-scroll. */
const NEAR_BOTTOM_THRESHOLD = 80;

/** Local pending/sent/failed message rendered alongside server history. */
interface DisplayMessage {
  key: string;
  text: string;
  sender: string;
  createdAt: string | number;
  outgoing: boolean;
  local?: PendingMessage;
}

function MessageBubble({
  text,
  createdAt,
  outgoing,
  senderName,
  showSender,
  status,
  error,
  onRetry,
  onDismiss,
}: {
  text: string;
  createdAt: string | number;
  outgoing: boolean;
  senderName: string | null;
  showSender: boolean;
  status?: "pending" | "sent" | "failed";
  error?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}) {
  return (
    <div className={`flex flex-col ${outgoing ? "items-end" : "items-start"}`}>
      {showSender && senderName && !outgoing && (
        <span className="text-muted-foreground mb-0.5 ml-1 text-xs">{senderName}</span>
      )}
      <div
        className={`max-w-[85%] rounded-2xl px-3 py-2 transition-opacity sm:max-w-md ${
          outgoing ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted rounded-bl-sm"
        } ${status === "pending" ? "opacity-70" : ""} ${
          status === "failed" ? "border-2 border-destructive" : ""
        }`}
      >
        <p className="text-sm whitespace-pre-wrap break-words">{text}</p>
        <span
          className={`mt-0.5 block text-right text-[10px] ${
            outgoing ? "text-primary-foreground/70" : "text-muted-foreground"
          }`}
        >
          {status === "pending" ? "Sending…" : status === "failed" ? "Failed" : messageTimeLabel(createdAt)}
        </span>
      </div>
      {status === "failed" && (
        <span className="mt-1 flex items-center gap-2 text-xs">
          <span className="text-destructive">{error ?? "Not delivered"}</span>
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              Retry
            </Button>
          )}
          {onDismiss && (
            <Button variant="ghost" size="sm" onClick={onDismiss}>
              Dismiss
            </Button>
          )}
        </span>
      )}
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

  const queryClient = useQueryClient();
  const { pendingMessages, hasPending, connected, send, retry, dismiss } = useSendMessage(
    conversation._id,
    currentUserId,
  );

  const [draft, setDraft] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  // scrollHeight captured before older messages are prepended, to anchor restore.
  const previousScrollHeight = useRef<number | null>(null);
  const nearBottom = useRef(true);
  // set when the user just submitted a message (forces scroll to bottom)
  const ownSubmission = useRef(false);
  const pageCount = data?.pages.length ?? 0;

  const serverMessages = useMemo(
    () => (data ? chronologicMessages(data.pages) : []),
    [data],
  );

  // Local entries stay until the server copy lands in history; then the server
  // row wins (matched by sender+text within a window — the ack carries no id).
  const visibleLocal = useMemo(
    () =>
      pendingMessages.filter(
        (item) =>
          item.status === "failed" ||
          !serverMessages.some(
            (message) =>
              message.sender === item.sender &&
              message.text === item.text &&
              Math.abs(new Date(message.createdAt).getTime() - item.createdAt) < 60_000,
          ),
      ),
    [pendingMessages, serverMessages],
  );

  const displayMessages: DisplayMessage[] = useMemo(() => {
    const fromServer: DisplayMessage[] = serverMessages.map((message: Message) => ({
      key: message._id,
      text: message.text,
      sender: message.sender,
      createdAt: message.createdAt,
      outgoing: message.sender === currentUserId,
    }));
    const fromLocal: DisplayMessage[] = visibleLocal.map((item) => ({
      key: item.clientId,
      text: item.text,
      sender: item.sender,
      createdAt: item.createdAt,
      outgoing: item.sender === currentUserId,
      local: item,
    }));
    // Both lists are chronological locally; merge by creation time.
    return [...fromServer, ...fromLocal].sort((a, b) => {
      const aTime = typeof a.createdAt === "number" ? a.createdAt : new Date(a.createdAt).getTime();
      const bTime = typeof b.createdAt === "number" ? b.createdAt : new Date(b.createdAt).getTime();
      return aTime - bTime;
    });
  }, [serverMessages, visibleLocal, currentUserId]);

  // Initial load and conversation switches land at the bottom (latest messages).
  useEffect(() => {
    const container = scrollRef.current;
    if (!isPending && container) container.scrollTop = container.scrollHeight;
  }, [isPending, conversation._id]);

  // After prepending an older page, restore the user's visual position.
  useEffect(() => {
    const container = scrollRef.current;
    if (container && previousScrollHeight.current !== null) {
      container.scrollTop = container.scrollHeight - previousScrollHeight.current;
      previousScrollHeight.current = null;
    }
  }, [pageCount]);

  // New messages: follow to bottom only if the user is near the bottom, or if
  // the user just submitted a message. Reading older messages is never disturbed.
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    if (ownSubmission.current || nearBottom.current) {
      container.scrollTop = container.scrollHeight;
    }
    ownSubmission.current = false;
  }, [displayMessages.length]);

  function handleScroll(event: React.UIEvent<HTMLDivElement>) {
    const container = event.currentTarget;
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    nearBottom.current = distanceFromBottom <= NEAR_BOTTOM_THRESHOLD;

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

  async function handleSubmit() {
    const text = draft.trim();
    if (text.length === 0 || hasPending || !connected) return;
    setDraft("");
    ownSubmission.current = true;
    await send(text);
    // Ask the server for the authoritative copy (sender gets no message:new).
    void queryClient.invalidateQueries({ queryKey: messageKeys.history(conversation._id) });
  }

  const subtitle =
    conversation.type === "direct"
      ? conversation.participant.phone
      : `${conversation.participants.length} members`;

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
        {conversation.type === "group" && (
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto shrink-0"
            onClick={() => setDetailsOpen(true)}
          >
            Details
          </Button>
        )}
        {!connected && (
          <span className="text-destructive shrink-0 text-xs">Reconnecting…</span>
        )}
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
        ) : displayMessages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-1 p-6 text-center">
            <p className="text-sm font-medium">No messages yet</p>
            <p className="text-muted-foreground text-xs">Say hello to start this conversation.</p>
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
            {displayMessages.map((message) => (
              <MessageBubble
                key={message.key}
                text={message.text}
                createdAt={message.createdAt}
                outgoing={message.outgoing}
                senderName={senderNames.get(message.sender) ?? "Unknown"}
                showSender={conversation.type === "group"}
                status={message.local?.status}
                error={message.local?.error}
                onRetry={
                  message.local && message.local.status === "failed"
                    ? () => void retry(message.local as PendingMessage)
                    : undefined
                }
                onDismiss={
                  message.local && message.local.status === "failed" ? () => dismiss(message.key) : undefined
                }
              />
            ))}
          </div>
        )}
      </div>

      <footer className="border-t p-3">
        <div className="flex items-end gap-2">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void handleSubmit();
              }
            }}
            rows={Math.min(4, Math.max(1, draft.split("\n").length))}
            placeholder={connected ? "Write a message…" : "Reconnecting…"}
            disabled={!connected}
            aria-label="Message input"
            className="border-input bg-background flex-1 resize-none rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          />
          <Button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!connected || hasPending || draft.trim().length === 0}
          >
            {hasPending ? "Sending…" : "Send"}
          </Button>
        </div>
      </footer>
      {conversation.type === "group" && (
        <GroupDetailsDialog
          group={conversation}
          currentUserId={currentUserId}
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
        />
      )}
    </section>
  );
}
