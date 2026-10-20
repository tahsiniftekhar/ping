"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { MessageBubble } from "@/components/chat/message-bubble";
import { cn } from "@/lib/utils";
import type { TimelineItem, TimelineMessage } from "@/features/messages/helpers";
import type { PendingMessage } from "@/features/messages/use-send-message";

const LOAD_OLDER_THRESHOLD = 60;
const NEAR_BOTTOM_THRESHOLD = 80;
const JUMP_THRESHOLD = 300;

export function MessageList({
  items,
  messages,
  pageCount,
  isGroup,
  senderNames,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  onRetry,
  onDismiss,
}: {
  items: TimelineItem[];
  messages: TimelineMessage[];
  pageCount: number;
  isGroup: boolean;
  senderNames: Map<string, string>;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  onRetry: (message: PendingMessage) => void;
  onDismiss: (clientId: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const previousScrollHeight = useRef<number | null>(null);
  const nearBottom = useRef(true);
  const previousTail = useRef<{ key: string; length: number } | null>(null);
  const [showJump, setShowJump] = useState(false);
  const [unread, setUnread] = useState(0);

  const lastMessage = messages[messages.length - 1];

  useLayoutEffect(() => {
    const container = scrollRef.current;
    if (container) container.scrollTop = container.scrollHeight;
  }, []);

  useLayoutEffect(() => {
    const container = scrollRef.current;
    if (container && previousScrollHeight.current !== null) {
      container.scrollTop = container.scrollHeight - previousScrollHeight.current;
      previousScrollHeight.current = null;
    }
  }, [pageCount]);

  useLayoutEffect(() => {
    const container = scrollRef.current;
    if (!container || !lastMessage) return;
    const previous = previousTail.current;
    previousTail.current = { key: lastMessage.key, length: messages.length };
    if (!previous || previous.key === lastMessage.key) return;

    if (lastMessage.outgoing || nearBottom.current) {
      container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
      return;
    }
    const previousIndex = messages.findIndex((message) => message.key === previous.key);
    const added =
      previousIndex >= 0
        ? messages.slice(previousIndex + 1).filter((message) => !message.outgoing).length
        : Math.max(0, messages.length - previous.length);
    if (added > 0) setUnread((count) => count + added);
  }, [lastMessage, messages]);

  function handleScroll(event: React.UIEvent<HTMLDivElement>) {
    const container = event.currentTarget;
    const distance = container.scrollHeight - container.scrollTop - container.clientHeight;
    nearBottom.current = distance <= NEAR_BOTTOM_THRESHOLD;
    setShowJump(distance > JUMP_THRESHOLD);
    if (nearBottom.current) setUnread(0);

    if (
      container.scrollTop <= LOAD_OLDER_THRESHOLD &&
      hasNextPage &&
      !isFetchingNextPage &&
      previousScrollHeight.current === null
    ) {
      previousScrollHeight.current = container.scrollHeight;
      fetchNextPage();
    }
  }

  function jumpToLatest() {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }

  return (
    <div className="relative h-full">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        role="log"
        aria-live="polite"
        aria-label="Message history"
        className="scrollbar-thin flex h-full flex-col overflow-y-auto px-4 py-4 sm:px-5"
      >
        {isFetchingNextPage && (
          <p className="animate-pulse py-1 text-center text-xs text-subtle">Loading older messages…</p>
        )}
        {!hasNextPage && !isFetchingNextPage && (
          <p className="pb-2 text-center text-xs text-subtle">Beginning of conversation</p>
        )}
        {items.map((item) =>
          item.kind === "date" ? (
            <div key={item.key} className="my-3 flex justify-center first:mt-0">
              <span className="rounded-full bg-muted px-3 py-1 text-[11px] font-medium text-muted-foreground">
                {item.label}
              </span>
            </div>
          ) : (
            <MessageBubble
              key={item.message.key}
              message={item.message}
              firstInRun={item.firstInRun}
              lastInRun={item.lastInRun}
              isGroup={isGroup}
              senderName={senderNames.get(item.message.sender) ?? "Unknown"}
              onRetry={
                item.message.local?.status === "failed"
                  ? () => onRetry(item.message.local as PendingMessage)
                  : undefined
              }
              onDismiss={
                item.message.local?.status === "failed" ? () => onDismiss(item.message.key) : undefined
              }
            />
          ),
        )}
      </div>

      {showJump && (
        <button
          type="button"
          onClick={jumpToLatest}
          aria-label={unread > 0 ? `Jump to latest, ${unread} new` : "Jump to latest"}
          className={cn(
            "absolute bottom-4 right-4 flex h-10 items-center justify-center gap-1.5 rounded-full border border-foreground/[0.08] bg-card text-foreground shadow-md transition-colors hover:bg-muted",
            unread > 0 ? "px-3.5 text-xs font-semibold" : "w-10",
          )}
        >
          {unread > 0 && <span className="text-brand-strong">{unread} new</span>}
          <ChevronDown className="size-4" />
        </button>
      )}
    </div>
  );
}
