"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { SendHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

const MAX_LENGTH = 4000;
const COUNTER_THRESHOLD = 3600;
const MAX_HEIGHT = 160;

const draftKey = (conversationId: string) => `ping.draft.${conversationId}`;

function readDraft(conversationId: string): string {
  if (typeof window === "undefined") return "";
  try {
    return window.sessionStorage.getItem(draftKey(conversationId)) ?? "";
  } catch {
    return "";
  }
}

function writeDraft(conversationId: string, value: string) {
  try {
    if (value) window.sessionStorage.setItem(draftKey(conversationId), value);
    else window.sessionStorage.removeItem(draftKey(conversationId));
  } catch {
    // storage unavailable (private mode / quota); drafts are best-effort
  }
}

export function MessageComposer({
  conversationId,
  connected,
  onSend,
}: {
  conversationId: string;
  connected: boolean;
  onSend: (text: string) => void;
}) {
  const [draft, setDraft] = useState(() => readDraft(conversationId));
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const canSend = connected && draft.trim().length > 0;

  useLayoutEffect(() => {
    const element = textareaRef.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, MAX_HEIGHT)}px`;
  }, [draft]);

  useLayoutEffect(() => {
    if (window.matchMedia("(pointer: fine)").matches) textareaRef.current?.focus();
  }, []);

  function update(value: string) {
    setDraft(value);
    writeDraft(conversationId, value);
  }

  function submit() {
    if (!canSend) return;
    onSend(draft.trim());
    update("");
    textareaRef.current?.focus();
  }

  return (
    <footer className="border-t border-foreground/[0.08] bg-card p-3">
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={draft}
          rows={1}
          maxLength={MAX_LENGTH}
          onChange={(event) => update(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              submit();
            }
          }}
          placeholder="Write a message…"
          aria-label="Message input"
          className="scrollbar-thin max-h-40 flex-1 resize-none rounded-2xl border border-foreground/10 bg-surface px-4 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-subtle focus:border-brand focus:ring-1 focus:ring-brand"
        />
        <button
          type="button"
          onClick={submit}
          disabled={!canSend}
          aria-label="Send message"
          title={connected ? "Send message" : "Reconnecting…"}
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-foreground text-background transition-all hover:bg-foreground/90 active:scale-95 disabled:opacity-40"
        >
          <SendHorizontal className="size-4" />
        </button>
      </div>
      <div className="mt-1.5 flex items-center justify-between px-1 text-[11px] text-subtle">
        <span className="hidden md:inline">Enter to send · Shift+Enter for new line</span>
        {draft.length >= COUNTER_THRESHOLD && (
          <span
            className={cn("ml-auto tabular-nums", draft.length >= MAX_LENGTH && "text-destructive")}
          >
            {draft.length}/{MAX_LENGTH}
          </span>
        )}
      </div>
    </footer>
  );
}
