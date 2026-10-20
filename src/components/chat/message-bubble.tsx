"use client";

import { useState } from "react";
import { AlertCircle, Check, Clock, Copy } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { linkify, messageTimeLabel, type TimelineMessage } from "@/features/messages/helpers";

const FRESH_MS = 10_000;

function MessageText({ text }: { text: string }) {
  return (
    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
      {linkify(text).map((segment, index) =>
        segment.href ? (
          <a
            key={index}
            href={segment.href}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 break-all"
          >
            {segment.text}
          </a>
        ) : (
          <span key={index}>{segment.text}</span>
        ),
      )}
    </p>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void copy()}
      aria-label={copied ? "Copied" : "Copy message"}
      title={copied ? "Copied" : "Copy message"}
      className="flex size-7 shrink-0 items-center justify-center self-center rounded-full text-subtle opacity-0 transition-opacity hover:bg-foreground/[0.06] hover:text-foreground focus-visible:opacity-100 group-focus-within/bubble:opacity-100 group-hover/bubble:opacity-100"
    >
      {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
    </button>
  );
}

export function MessageBubble({
  message,
  firstInRun,
  lastInRun,
  isGroup,
  senderName,
  onRetry,
  onDismiss,
}: {
  message: TimelineMessage;
  firstInRun: boolean;
  lastInRun: boolean;
  isGroup: boolean;
  senderName: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}) {
  const { outgoing, local } = message;
  const status = local?.status;
  // Evaluated once at mount so only freshly arrived messages animate.
  const [fresh] = useState(() => Date.now() - message.createdAt < FRESH_MS);
  const showAvatar = isGroup && !outgoing;

  return (
    <div
      className={cn(
        "flex gap-2",
        outgoing ? "justify-end" : "justify-start",
        firstInRun ? "mt-3 first:mt-0" : "mt-0.5",
        fresh && "animate-message-in",
      )}
    >
      {showAvatar &&
        (lastInRun ? (
          <Avatar name={senderName} seed={message.sender} size="xs" className="self-end" />
        ) : (
          <span className="w-6 shrink-0" aria-hidden />
        ))}
      <div className={cn("flex max-w-[75%] flex-col", outgoing ? "items-end" : "items-start")}>
        {showAvatar && firstInRun && (
          <span className="mb-1 ml-1 text-[11px] font-semibold text-subtle">{senderName}</span>
        )}
        <div className={cn("group/bubble flex gap-1", outgoing && "flex-row-reverse")}>
          <div
            className={cn(
              "rounded-2xl px-3.5 py-2 transition-opacity",
              outgoing
                ? "bg-foreground text-background"
                : "border border-foreground/[0.08] bg-card text-foreground",
              lastInRun && (outgoing ? "rounded-br-sm" : "rounded-bl-sm"),
              status === "pending" && "opacity-70",
              status === "failed" && "border border-destructive bg-destructive/10 text-foreground",
            )}
          >
            <MessageText text={message.text} />
            {lastInRun && (
              <span
                className={cn(
                  "mt-0.5 flex items-center justify-end gap-1 text-[10px]",
                  outgoing && status !== "failed" ? "text-background/60" : "text-subtle",
                )}
              >
                {status === "failed" ? (
                  <>
                    <AlertCircle className="size-3 text-destructive" aria-hidden />
                    <span className="text-destructive">Failed</span>
                  </>
                ) : (
                  <>
                    <time>{messageTimeLabel(message.createdAt)}</time>
                    {outgoing &&
                      (status === "pending" ? (
                        <Clock className="size-3" aria-label="Sending" />
                      ) : (
                        <Check className="size-3" aria-label="Sent" />
                      ))}
                  </>
                )}
              </span>
            )}
          </div>
          <CopyButton text={message.text} />
        </div>
        {status === "failed" && (
          <span className="mt-1 flex items-center gap-2 text-xs">
            <span className="text-destructive">{local?.error ?? "Not delivered"}</span>
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
    </div>
  );
}
