"use client";

import { useState, useEffect } from "react";

export function FeaturesSection() {
  // Mini-simulation 1: Phone login state
  const [phoneStep, setPhoneStep] = useState<"typing" | "verifying" | "ready">("typing");
  useEffect(() => {
    const interval = setInterval(() => {
      setPhoneStep((prev) => {
        if (prev === "typing") return "verifying";
        if (prev === "verifying") return "ready";
        return "typing";
      });
    }, 2400);
    return () => clearInterval(interval);
  }, []);

  // Mini-simulation 2: Group scaling
  const [groupCount, setGroupCount] = useState(1);
  useEffect(() => {
    const interval = setInterval(() => {
      setGroupCount((prev) => (prev >= 3 ? 1 : prev + 1));
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  // Mini-simulation 3: Latency & message arrival ticker
  const [ticker, setTicker] = useState(12);
  useEffect(() => {
    const interval = setInterval(() => {
      setTicker((prev) => (prev >= 99 ? 10 : prev + 1));
    }, 3200);
    return () => clearInterval(interval);
  }, []);

  return (
    <section 
      id="how-it-works" 
      className="relative mx-auto w-full max-w-[1280px] border-t border-[#171717]/[0.08] px-6 py-24 sm:px-8 sm:py-32 lg:px-12 lg:py-36"
    >
      {/* Header */}
      <div className="mb-16 sm:mb-20 max-w-2xl">
        <div className="flex items-center gap-2 mb-4">
          <span className="size-1.5 rounded-full bg-[#2878F0]" />
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#1D63C8]">
            How Ping Works
          </span>
        </div>
        <h2 className="text-3xl font-extrabold tracking-[-0.03em] text-[#171717] sm:text-4xl lg:text-5xl leading-[1.08]">
          Simple mechanics.<br />Deliberate behavior.
        </h2>
      </div>

      {/* Structured Editorial 4-Block Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        
        {/* Block 01: Passwordless access */}
        <div className="flex flex-col justify-between rounded-[20px] border border-[#171717]/[0.08] bg-[#FAFAF8] p-6 sm:p-7 shadow-[0_2px_12px_rgba(23,23,23,0.02)] transition-colors hover:border-[#171717]/20">
          <div>
            <span className="font-mono text-xs font-semibold text-[#8A8A86]">01</span>
            <h3 className="mt-3 text-lg font-bold tracking-tight text-[#171717]">
              Passwordless access
            </h3>
            <p className="mt-2 text-sm text-[#626262] leading-relaxed">
              Enter your phone number. No password to remember. Automatic registration behind the scenes.
            </p>
          </div>

          {/* Visualization Tray */}
          <div className="mt-8 rounded-xl border border-[#171717]/[0.06] bg-[#F5F5F3] p-3.5 select-none">
            <div className="flex items-center justify-between font-mono text-[11px] text-[#171717]">
              <span>+1 (555) 019-2831</span>
              {phoneStep === "typing" && (
                <span className="size-1.5 rounded-full bg-[#8A8A86] animate-pulse" />
              )}
              {phoneStep === "verifying" && (
                <span className="text-[9px] text-[#8A8A86]">verifying</span>
              )}
              {phoneStep === "ready" && (
                <span className="text-[9px] font-semibold text-[#34C759]">active</span>
              )}
            </div>
          </div>
        </div>

        {/* Block 02: Direct & group conversations */}
        <div className="flex flex-col justify-between rounded-[20px] border border-[#171717]/[0.08] bg-[#FAFAF8] p-6 sm:p-7 shadow-[0_2px_12px_rgba(23,23,23,0.02)] transition-colors hover:border-[#171717]/20">
          <div>
            <span className="font-mono text-xs font-semibold text-[#8A8A86]">02</span>
            <h3 className="mt-3 text-lg font-bold tracking-tight text-[#171717]">
              Direct & group spaces
            </h3>
            <p className="mt-2 text-sm text-[#626262] leading-relaxed">
              Talk directly or gather people into focused group spaces with dynamic membership and admin controls.
            </p>
          </div>

          {/* Visualization Tray */}
          <div className="mt-8 rounded-xl border border-[#171717]/[0.06] bg-[#F5F5F3] p-3.5 select-none">
            <div className="flex items-center gap-1.5 overflow-hidden">
              <span className="rounded-full bg-[#171717] px-2 py-0.5 text-[10px] font-medium text-white">You</span>
              {groupCount >= 2 && (
                <span className="rounded-full bg-[#EAEAE7] border border-[#171717]/[0.08] px-2 py-0.5 text-[10px] font-medium text-[#171717]">Ada</span>
              )}
              {groupCount >= 3 && (
                <span className="rounded-full bg-[#EAEAE7] border border-[#171717]/[0.08] px-2 py-0.5 text-[10px] font-medium text-[#171717]">Tahsin</span>
              )}
            </div>
          </div>
        </div>

        {/* Block 03: Realtime by default */}
        <div className="flex flex-col justify-between rounded-[20px] border border-[#171717]/[0.08] bg-[#FAFAF8] p-6 sm:p-7 shadow-[0_2px_12px_rgba(23,23,23,0.02)] transition-colors hover:border-[#171717]/20">
          <div>
            <span className="font-mono text-xs font-semibold text-[#8A8A86]">03</span>
            <h3 className="mt-3 text-lg font-bold tracking-tight text-[#171717]">
              Realtime by default
            </h3>
            <p className="mt-2 text-sm text-[#626262] leading-relaxed">
              Messages, presence and conversation updates arrive immediately over persistent WebSocket streams.
            </p>
          </div>

          {/* Visualization Tray */}
          <div className="mt-8 rounded-xl border border-[#171717]/[0.06] bg-[#F5F5F3] p-3.5 select-none flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-[#34C759]" />
              <span className="font-mono text-[10px] uppercase text-[#626262]">Socket stream</span>
            </div>
            <span className="font-mono text-[11px] font-bold text-[#2878F0]">#{ticker}</span>
          </div>
        </div>

        {/* Block 04: History without disruption */}
        <div className="flex flex-col justify-between rounded-[20px] border border-[#171717]/[0.08] bg-[#FAFAF8] p-6 sm:p-7 shadow-[0_2px_12px_rgba(23,23,23,0.02)] transition-colors hover:border-[#171717]/20">
          <div>
            <span className="font-mono text-xs font-semibold text-[#8A8A86]">04</span>
            <h3 className="mt-3 text-lg font-bold tracking-tight text-[#171717]">
              History without disruption
            </h3>
            <p className="mt-2 text-sm text-[#626262] leading-relaxed">
              Read older messages without losing your position. Viewport stays anchored until you choose to scroll.
            </p>
          </div>

          {/* Visualization Tray */}
          <div className="mt-8 rounded-xl border border-[#171717]/[0.06] bg-[#F5F5F3] p-3.5 select-none flex items-center justify-between">
            <span className="font-mono text-[10px] text-[#8A8A86]">Scroll position</span>
            <span className="rounded-full bg-[#171717] px-2 py-0.5 text-[9px] font-semibold text-white tracking-wide uppercase">
              Anchored
            </span>
          </div>
        </div>

      </div>
    </section>
  );
}
