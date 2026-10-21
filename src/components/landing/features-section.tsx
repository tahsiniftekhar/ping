"use client";

import { useState, useEffect } from "react";

export function FeaturesSection() {
  // Mini-simulation 1: Phone login state
  const [phoneStep, setPhoneStep] = useState<"typing" | "signing" | "ready">("typing");
  useEffect(() => {
    const interval = setInterval(() => {
      setPhoneStep((prev) => {
        if (prev === "typing") return "signing";
        if (prev === "signing") return "ready";
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
      className="relative mx-auto w-full max-w-[1280px] border-t border-foreground/[0.08] px-6 py-24 sm:px-8 sm:py-32 lg:px-12 lg:py-36"
    >
      {/* Header */}
      <div className="mb-16 sm:mb-20 max-w-2xl">
        <div className="flex items-center gap-2 mb-4">
          <span className="size-1.5 rounded-full bg-brand" />
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-brand-strong">
            How Ping Works
          </span>
        </div>
        <h2 className="text-3xl font-extrabold tracking-[-0.03em] text-foreground sm:text-4xl lg:text-5xl leading-[1.08]">
          Simple mechanics.<br />Deliberate behavior.
        </h2>
      </div>

      {/* Structured Editorial 4-Block Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        
        {/* Block 01: Sandbox sign-in */}
        <div className="flex flex-col justify-between rounded-[20px] border border-foreground/[0.08] bg-card p-6 sm:p-7 shadow-[0_2px_12px_rgba(23,23,23,0.02)] transition-colors hover:border-foreground/20">
          <div>
            <span className="font-mono text-xs font-semibold text-subtle">01</span>
            <h3 className="mt-3 text-lg font-bold tracking-tight text-foreground">
              Sandbox sign-in
            </h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Enter any phone number. No password and no code: this is a demo, and new numbers are registered on first sign-in.
            </p>
          </div>

          {/* Visualization Tray */}
          <div className="mt-8 rounded-xl border border-foreground/[0.06] bg-background p-3.5 select-none">
            <div className="flex items-center justify-between font-mono text-[11px] text-foreground">
              <span>+1 (555) 019-2831</span>
              {phoneStep === "typing" && (
                <span className="size-1.5 rounded-full bg-subtle animate-pulse" />
              )}
              {phoneStep === "signing" && (
                <span className="text-[9px] text-subtle">signing in</span>
              )}
              {phoneStep === "ready" && (
                <span className="text-[9px] font-semibold text-success">active</span>
              )}
            </div>
          </div>
        </div>

        {/* Block 02: Direct & group conversations */}
        <div className="flex flex-col justify-between rounded-[20px] border border-foreground/[0.08] bg-card p-6 sm:p-7 shadow-[0_2px_12px_rgba(23,23,23,0.02)] transition-colors hover:border-foreground/20">
          <div>
            <span className="font-mono text-xs font-semibold text-subtle">02</span>
            <h3 className="mt-3 text-lg font-bold tracking-tight text-foreground">
              Direct & group spaces
            </h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Talk directly or gather people into focused group spaces with dynamic membership and admin controls.
            </p>
          </div>

          {/* Visualization Tray */}
          <div className="mt-8 rounded-xl border border-foreground/[0.06] bg-background p-3.5 select-none">
            <div className="flex items-center gap-1.5 overflow-hidden">
              <span className="rounded-full bg-foreground px-2 py-0.5 text-[10px] font-medium text-background">You</span>
              {groupCount >= 2 && (
                <span className="rounded-full bg-muted border border-foreground/[0.08] px-2 py-0.5 text-[10px] font-medium text-foreground">Ada</span>
              )}
              {groupCount >= 3 && (
                <span className="rounded-full bg-muted border border-foreground/[0.08] px-2 py-0.5 text-[10px] font-medium text-foreground">Tahsin</span>
              )}
            </div>
          </div>
        </div>

        {/* Block 03: Realtime by default */}
        <div className="flex flex-col justify-between rounded-[20px] border border-foreground/[0.08] bg-card p-6 sm:p-7 shadow-[0_2px_12px_rgba(23,23,23,0.02)] transition-colors hover:border-foreground/20">
          <div>
            <span className="font-mono text-xs font-semibold text-subtle">03</span>
            <h3 className="mt-3 text-lg font-bold tracking-tight text-foreground">
              Realtime by default
            </h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              New messages and conversation list updates are pushed over a persistent Socket.io connection.
            </p>
          </div>

          {/* Visualization Tray */}
          <div className="mt-8 rounded-xl border border-foreground/[0.06] bg-background p-3.5 select-none flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-success" />
              <span className="font-mono text-[10px] uppercase text-muted-foreground">Socket stream</span>
            </div>
            <span className="font-mono text-[11px] font-bold text-brand">#{ticker}</span>
          </div>
        </div>

        {/* Block 04: History without disruption */}
        <div className="flex flex-col justify-between rounded-[20px] border border-foreground/[0.08] bg-card p-6 sm:p-7 shadow-[0_2px_12px_rgba(23,23,23,0.02)] transition-colors hover:border-foreground/20">
          <div>
            <span className="font-mono text-xs font-semibold text-subtle">04</span>
            <h3 className="mt-3 text-lg font-bold tracking-tight text-foreground">
              History without disruption
            </h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Read older messages without losing your position. Viewport stays anchored until you choose to scroll.
            </p>
          </div>

          {/* Visualization Tray */}
          <div className="mt-8 rounded-xl border border-foreground/[0.06] bg-background p-3.5 select-none flex items-center justify-between">
            <span className="font-mono text-[10px] text-subtle">Scroll position</span>
            <span className="rounded-full bg-foreground px-2 py-0.5 text-[9px] font-semibold text-background tracking-wide uppercase">
              Anchored
            </span>
          </div>
        </div>

      </div>
    </section>
  );
}
