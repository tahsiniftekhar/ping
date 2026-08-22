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
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setVisibleCount((prev) => {
        if (prev < SHOWCASE_MESSAGES.length) {
          setIsTyping(false);
          return prev + 1;
        } else {
          setIsTyping(true);
          return 2;
        }
      });
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section 
      id="showcase" 
      className="relative mx-auto w-full max-w-[1280px] border-t border-[#171717]/[0.08] px-6 py-24 sm:px-8 sm:py-32 lg:px-12 lg:py-36"
    >
      <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-16">
        
        {/* Left Column: Narrative */}
        <div className="flex flex-col items-start lg:col-span-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="size-1.5 rounded-full bg-[#2878F0]" />
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#1D63C8]">
              Product in motion
            </span>
          </div>

          <h2 className="text-3xl font-extrabold tracking-[-0.03em] text-[#171717] sm:text-4xl lg:text-5xl leading-[1.08] mb-6">
            Built around<br />conversation.
          </h2>

          <p className="text-base sm:text-lg text-[#626262] leading-relaxed mb-6">
            Every interaction is tuned to feel instantaneous and predictable. From instant socket deliveries to un-interrupted scroll history, the interface gets out of your way.
          </p>

          {/* Feature Points */}
          <div className="flex flex-col gap-3 font-mono text-xs text-[#626262]">
            <div className="flex items-center gap-2.5">
              <span className="size-1.5 rounded-full bg-[#34C759]" />
              <span>Instant direct & multi-party spaces</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="size-1.5 rounded-full bg-[#34C759]" />
              <span>Live typing & presence synchronization</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="size-1.5 rounded-full bg-[#34C759]" />
              <span>Anchored viewport preservation</span>
            </div>
          </div>
        </div>

        {/* Right Column: Controlled Presentation Component */}
        <div className="lg:col-span-7 w-full select-none">
          <div className="rounded-[24px] border border-[#171717]/[0.10] bg-[#FAFAF8] p-4 sm:p-6 shadow-[0_8px_32px_rgba(23,23,23,0.04)]">
            
            {/* Window Bar */}
            <div className="flex items-center justify-between border-b border-[#171717]/[0.08] pb-4 mb-4">
              {/* Tabs */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("group")}
                  className={cn(
                    "rounded-full px-3.5 py-1 text-xs font-semibold transition-all",
                    activeTab === "group" 
                      ? "bg-[#171717] text-white" 
                      : "text-[#626262] hover:text-[#171717] hover:bg-[#EAEAE7]"
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
                      ? "bg-[#171717] text-white" 
                      : "text-[#626262] hover:text-[#171717] hover:bg-[#EAEAE7]"
                  )}
                >
                  Ada Lovelace (1:1)
                </button>
              </div>

              {/* Status */}
              <div className="flex items-center gap-1.5 font-mono text-[10px] text-[#34C759]">
                <span className="size-2 rounded-full bg-[#34C759] animate-pulse" />
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
                          isYou ? "bg-[#171717] text-white" : "bg-[#EAEAE7] text-[#171717] border border-[#171717]/[0.08]"
                        )}>
                          {msg.sender === "tahsin" ? "T" : msg.sender === "ada" ? "A" : "U"}
                        </div>
                        <div className={cn(
                          "rounded-[16px] px-4 py-2.5 text-xs sm:text-sm font-medium",
                          isYou 
                            ? "bg-[#171717] text-white rounded-tr-xs" 
                            : "bg-[#F5F5F3] text-[#171717] border border-[#171717]/[0.08] rounded-tl-xs"
                        )}>
                          <p>{msg.text}</p>
                          <span className={cn(
                            "mt-1 block font-mono text-[9px] text-right",
                            isYou ? "text-white/40" : "text-[#8A8A86]"
                          )}>
                            {msg.time}
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {/* Typing State */}
                  {isTyping && (
                    <div className="flex items-start gap-3 self-start">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#EAEAE7] text-xs font-semibold text-[#171717] border border-[#171717]/[0.08]">
                        A
                      </div>
                      <div className="flex items-center gap-1 rounded-[16px] rounded-tl-xs bg-[#F5F5F3] border border-[#171717]/[0.08] px-3.5 py-3">
                        <span className="size-1.5 rounded-full bg-[#8A8A86] animate-pulse" />
                        <span className="size-1.5 rounded-full bg-[#8A8A86] animate-pulse" style={{ animationDelay: "200ms" }} />
                        <span className="size-1.5 rounded-full bg-[#8A8A86] animate-pulse" style={{ animationDelay: "400ms" }} />
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="flex items-start gap-3 self-start max-w-[85%]">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#EAEAE7] text-xs font-semibold text-[#171717] border border-[#171717]/[0.08]">
                      A
                    </div>
                    <div className="rounded-[16px] rounded-tl-xs bg-[#F5F5F3] border border-[#171717]/[0.08] px-4 py-2.5 text-xs sm:text-sm font-medium text-[#171717]">
                      <p>Direct channel established. Messages are delivered with low latency.</p>
                      <span className="mt-1 block font-mono text-[9px] text-[#8A8A86] text-right">Just now</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 self-end flex-row-reverse max-w-[85%]">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#171717] text-xs font-semibold text-white">
                      U
                    </div>
                    <div className="rounded-[16px] rounded-tr-xs bg-[#171717] px-4 py-2.5 text-xs sm:text-sm font-medium text-white">
                      <p>Confirmed. Clean connection.</p>
                      <span className="mt-1 block font-mono text-[9px] text-white/40 text-right">Just now</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input Simulator Footer */}
            <div className="mt-4 border-t border-[#171717]/[0.08] pt-3 flex items-center justify-between px-2 font-mono text-xs text-[#8A8A86]">
              <span>Type a message...</span>
              <span className="rounded-full bg-[#171717]/[0.06] px-2.5 py-0.5 text-[10px] uppercase font-semibold text-[#171717]">Return ↵</span>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
