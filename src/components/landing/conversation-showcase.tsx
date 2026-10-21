"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface ShowcaseMessage {
  id: string;
  sender: "tahsin" | "you" | "ada";
  name: string;
  text: string;
  time: string;
}

const SHOWCASE_MESSAGES: ShowcaseMessage[] = [
  {
    id: "s1",
    sender: "tahsin",
    name: "Tahsin",
    text: "The new message layout is ready for review.",
    time: "10:42 AM",
  },
  {
    id: "s2",
    sender: "you",
    name: "You",
    text: "Testing the scroll pinning behavior now.",
    time: "10:43 AM",
  },
  {
    id: "s3",
    sender: "ada",
    name: "Ada",
    text: "Everything updates cleanly over socket events.",
    time: "10:44 AM",
  },
];

export function ConversationShowcase() {
  const [activeTab, setActiveTab] = useState<"group" | "direct">("group");
  const [visibleCount, setVisibleCount] = useState(2);

  useEffect(() => {
    const timer = setInterval(() => {
      setVisibleCount((prev) => (prev < SHOWCASE_MESSAGES.length ? prev + 1 : 2));
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section 
      id="showcase" 
      className="relative mx-auto w-full max-w-[1280px] border-t border-foreground/[0.08] px-6 py-24 sm:px-8 sm:py-32 lg:px-12 lg:py-36"
    >
      <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-16">
        
        {/* Left Column: Narrative */}
        <div className="flex flex-col items-start lg:col-span-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="size-1.5 rounded-full bg-brand" />
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-brand-strong">
              Product in motion
            </span>
          </div>

          <h2 className="text-3xl font-extrabold tracking-[-0.03em] text-foreground sm:text-4xl lg:text-5xl leading-[1.08] mb-6">
            Built around<br />conversation.
          </h2>

          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed mb-6">
            Messages arrive over Socket.io, and the server makes delivery predictable: every send carries a key, every message gets a position, and a dropped connection catches up on its own.
          </p>

          {/* Feature Points */}
          <div className="flex flex-col gap-3 font-mono text-xs text-muted-foreground">
            <div className="flex items-center gap-2.5">
              <span className="size-1.5 rounded-full bg-success" />
              <span>Sends are idempotent: a retry never duplicates a message</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="size-1.5 rounded-full bg-success" />
              <span>Reconnect replays exactly what you missed</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="size-1.5 rounded-full bg-success" />
              <span>Order comes from the server, not the clock</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="size-1.5 rounded-full bg-success" />
              <span>Older history loads without moving your scroll position</span>
            </div>
          </div>
        </div>

        {/* Right Column: Controlled Presentation Component */}
        <div className="lg:col-span-7 w-full select-none">
          <div className="rounded-[24px] border border-foreground/[0.10] bg-card p-4 sm:p-6 shadow-[0_8px_32px_rgba(23,23,23,0.04)]">
            
            {/* Window Bar */}
            <div className="flex items-center justify-between border-b border-foreground/[0.08] pb-4 mb-4">
              {/* Tabs */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("group")}
                  className={cn(
                    "rounded-full px-3.5 py-1 text-xs font-semibold transition-all",
                    activeTab === "group" 
                      ? "bg-foreground text-background" 
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  Core Team (Group)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("direct")}
                  className={cn(
                    "rounded-full px-3.5 py-1 text-xs font-semibold transition-all",
                    activeTab === "direct" 
                      ? "bg-foreground text-background" 
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  Ada Lovelace (1:1)
                </button>
              </div>

              {/* Status */}
              <div className="flex items-center gap-1.5 font-mono text-[10px] text-success">
                <span className="size-2 rounded-full bg-success animate-pulse" />
                <span className="uppercase tracking-wider font-semibold">Live</span>
              </div>
            </div>

            {/* Conversation Feed */}
            <div className="flex flex-col gap-4 min-h-[260px] justify-end p-2 sm:p-4">
              {activeTab === "group" ? (
                <>
                  {SHOWCASE_MESSAGES.slice(0, visibleCount).map((msg) => {
                    const isYou = msg.sender === "you";
                    return (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex items-start gap-3 max-w-[85%] transition-all duration-300",
                          isYou ? "self-end flex-row-reverse" : "self-start"
                        )}
                      >
                        <div className={cn(
                          "flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                          isYou ? "bg-foreground text-background" : "bg-muted text-foreground border border-foreground/[0.08]"
                        )}>
                          {msg.sender === "tahsin" ? "T" : msg.sender === "ada" ? "A" : "U"}
                        </div>
                        <div className={cn(
                          "rounded-[16px] px-4 py-2.5 text-xs sm:text-sm font-medium",
                          isYou 
                            ? "bg-foreground text-background rounded-tr-xs" 
                            : "bg-background text-foreground border border-foreground/[0.08] rounded-tl-xs"
                        )}>
                          <p>{msg.text}</p>
                          <span className={cn(
                            "mt-1 block font-mono text-[9px] text-right",
                            isYou ? "text-background/40" : "text-subtle"
                          )}>
                            {msg.time}
                          </span>
                        </div>
                      </div>
                    );
                  })}

                </>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="flex items-start gap-3 self-start max-w-[85%]">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground border border-foreground/[0.08]">
                      A
                    </div>
                    <div className="rounded-[16px] rounded-tl-xs bg-background border border-foreground/[0.08] px-4 py-2.5 text-xs sm:text-sm font-medium text-foreground">
                      <p>Direct channel established. Messages are delivered with low latency.</p>
                      <span className="mt-1 block font-mono text-[9px] text-subtle text-right">Just now</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 self-end flex-row-reverse max-w-[85%]">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background">
                      U
                    </div>
                    <div className="rounded-[16px] rounded-tr-xs bg-foreground px-4 py-2.5 text-xs sm:text-sm font-medium text-background">
                      <p>Confirmed. Clean connection.</p>
                      <span className="mt-1 block font-mono text-[9px] text-background/40 text-right">Just now</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input Simulator Footer */}
            <div className="mt-4 border-t border-foreground/[0.08] pt-3 flex items-center justify-between px-2 font-mono text-xs text-subtle">
              <span>Type a message...</span>
              <span className="rounded-full bg-foreground/[0.06] px-2.5 py-0.5 text-[10px] uppercase font-semibold text-foreground">Return ↵</span>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
