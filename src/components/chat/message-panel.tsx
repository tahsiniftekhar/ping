"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { conversationTitle } from "@/features/conversations/helpers";
import { GroupDetailsDialog } from "@/components/chat/group-details-dialog";
import { chronologicMessages, messageKeys, useMessageHistory } from "@/features/messages/queries";
import { messageTimeLabel } from "@/features/messages/helpers";
import { useSendMessage, type PendingMessage } from "@/features/messages/use-send-message";
import { useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/lib/api/client";
import type { Conversation, Message } from "@/types/api";
import { Button } from "@/components/ui/button";

const LOAD_OLDER_THRESHOLD = 60;
const NEAR_BOTTOM_THRESHOLD = 80;

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
        <span className="text-[11px] font-semibold text-[#8A8A86] mb-1 ml-1">{senderName}</span>
      )}
      <div
        className={`max-w-[85%] px-4 py-2.5 transition-opacity sm:max-w-md ${
          outgoing
            ? "bg-[#171717] text-white rounded-[18px] rounded-tr-xs shadow-[0_4px_16px_rgba(23,23,23,0.06)]"
            : "bg-[#FAFAF8] text-[#171717] border border-[#171717]/[0.08] rounded-[18px] rounded-tl-xs shadow-[0_2px_8px_rgba(23,23,23,0.02)]"
        } ${status === "pending" ? "opacity-70" : ""} ${
          status === "failed" ? "border-2 border-red-500" : ""
        }`}
      >
        <p className="text-xs sm:text-sm font-medium whitespace-pre-wrap break-words leading-relaxed">{text}</p>
        <span
          className={`mt-1 block font-mono text-right text-[9px] ${
            outgoing ? "text-white/50" : "text-[#8A8A86]"
          }`}
        >
          {status === "pending" ? "Sending…" : status === "failed" ? "Failed" : messageTimeLabel(createdAt)}
        </span>
      </div>
      {status === "failed" && (
        <span className="mt-1 flex items-center gap-2 text-xs">
          <span className="text-red-600">{error ?? "Not delivered"}</span>
          {onRetry && (
            <Button variant="outline" size="sm" className="h-6 rounded-full text-[10px]" onClick={onRetry}>
              Retry
            </Button>
          )}
          {onDismiss && (
            <Button variant="ghost" size="sm" className="h-6 rounded-full text-[10px]" onClick={onDismiss}>
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
  onConversationLeft,
  onBack,
}: {
  conversation: Conversation;
  currentUserId: string;
  onConversationLeft: () => void;
  onBack?: () => void;
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
  const previousScrollHeight = useRef<number | null>(null);
  const nearBottom = useRef(true);
  const ownSubmission = useRef(false);
  const pageCount = data?.pages.length ?? 0;

  const serverMessages = useMemo(
    () => (data ? chronologicMessages(data.pages) : []),
    [data],
  );

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
    return [...fromServer, ...fromLocal].sort((a, b) => {
      const aTime = typeof a.createdAt === "number" ? a.createdAt : new Date(a.createdAt).getTime();
      const bTime = typeof b.createdAt === "number" ? b.createdAt : new Date(b.createdAt).getTime();
      return aTime - bTime;
    });
  }, [serverMessages, visibleLocal, currentUserId]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!isPending && container) container.scrollTop = container.scrollHeight;
  }, [isPending, conversation._id]);

  useEffect(() => {
    const container = scrollRef.current;
    if (container && previousScrollHeight.current !== null) {
      container.scrollTop = container.scrollHeight - previousScrollHeight.current;
      previousScrollHeight.current = null;
    }
  }, [pageCount]);

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
    <section className="flex min-h-0 flex-1 flex-col bg-white">
      {/* Chat Header */}
      <header className="flex min-h-14 items-center justify-between gap-3 border-b border-[#171717]/[0.08] px-4 py-3 bg-[#FAFAF8] sm:px-5">
        <div className="flex items-center gap-2.5 min-w-0">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label="Back to conversations"
              className="flex size-8 shrink-0 items-center justify-center rounded-full text-[#171717] hover:bg-[#171717]/[0.06] transition-colors md:hidden -ml-1"
            >
              <ArrowLeft className="size-4" />
            </button>
          )}
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#EAEAE7] text-xs font-bold text-[#171717] border border-[#171717]/[0.06]">
            {conversation.type === "group" ? (
              <span aria-hidden>👥</span>
            ) : (
              conversationTitle(conversation).charAt(0).toUpperCase()
            )}
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-bold tracking-tight text-[#171717]">{conversationTitle(conversation)}</h2>
            <p className="font-mono text-[10px] text-[#8A8A86] truncate">{subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {conversation.type === "group" && (
            <button
              type="button"
              className="rounded-full border border-[#171717]/10 bg-white px-3.5 py-1 text-xs font-semibold text-[#171717] transition-colors hover:bg-[#171717]/[0.05]"
              onClick={() => setDetailsOpen(true)}
            >
              Details
            </button>
          )}
          {!connected && (
            <span className="font-mono text-[10px] text-red-600 shrink-0">Reconnecting…</span>
          )}
        </div>
      </header>

      {/* Message Stream */}
      <div className="relative min-h-0 flex-1 bg-[#F5F5F3]/35">
        {isPending ? (
          <div className="flex h-full flex-col justify-end gap-3 p-5" aria-label="Loading messages">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className={`h-10 w-1/3 animate-pulse rounded-[18px] bg-[#EAEAE7] ${
                  index % 2 === 0 ? "self-start" : "self-end"
                }`}
              />
            ))}
          </div>
        ) : isError ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="text-xs text-red-600">
              {error instanceof ApiError
                ? error.message
                : "Could not load messages. Please try again."}
            </p>
            <Button variant="outline" size="sm" className="h-8 rounded-full text-xs" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : displayMessages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-1.5 p-6 text-center">
            <p className="text-xs font-bold text-[#171717]">No messages yet</p>
            <p className="text-[11px] text-[#8A8A86]">Say hello to start this conversation.</p>
          </div>
        ) : (
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex h-full flex-col gap-3 overflow-y-auto p-5"
            aria-label="Message history"
          >
            {isFetchingNextPage && (
              <p className="font-mono text-[10px] text-[#8A8A86] animate-pulse py-1 text-center">
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

      {/* Input Area */}
      <footer className="border-t border-[#171717]/[0.08] p-3.5 bg-[#FAFAF8]">
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
            className="flex-1 resize-none rounded-2xl border border-[#171717]/10 bg-white px-4 py-2.5 text-xs sm:text-sm text-[#171717] placeholder:text-[#8A8A86] outline-none transition-colors focus:border-[#2878F0] focus:ring-1 focus:ring-[#2878F0] disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!connected || hasPending || draft.trim().length === 0}
            className="rounded-full bg-[#171717] hover:bg-[#171717]/90 text-white px-5 py-2.5 text-xs font-semibold transition-all active:scale-[0.98] disabled:opacity-40"
          >
            {hasPending ? "Sending…" : "Send"}
          </button>
        </div>
      </footer>

      {conversation.type === "group" && (
        <GroupDetailsDialog
          group={conversation}
          currentUserId={currentUserId}
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
          onLeft={onConversationLeft}
        />
      )}
    </section>
  );
}
