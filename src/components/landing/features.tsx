"use client";

import { useState, useEffect } from "react";

export function Features() {
  // Feature 1: Passwordless auth state simulator
  const [phoneState, setPhoneState] = useState<"empty" | "typing" | "submitting" | "done">("empty");
  useEffect(() => {
    const timer = setInterval(() => {
      setPhoneState((prev) => {
        if (prev === "empty") return "typing";
        if (prev === "typing") return "submitting";
        if (prev === "submitting") return "done";
        return "empty";
      });
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  // Feature 2: Group Creation state simulator
  const [groupMembers, setGroupMembers] = useState<string[]>(["You"]);
  useEffect(() => {
    const timer = setInterval(() => {
      setGroupMembers((prev) => {
        if (prev.length === 1) return ["You", "Ada"];
        if (prev.length === 2) return ["You", "Ada", "Tahsin"];
        return ["You"];
      });
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  // Feature 3: Realtime Delivery ticker
  const [deliveryCount, setDeliveryCount] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setDeliveryCount((prev) => prev + 1);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section id="features" className="mx-auto w-full max-w-7xl px-6 py-16 sm:px-8">
      {styleTag}

      <div className="mb-12 max-w-2xl">
        <span className="text-xs font-bold uppercase tracking-wider text-[#0071E3]">Walkthrough</span>
        <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-[#1D1D1F] sm:text-4xl">
          Core mechanics, built for focus.
        </h2>
        <p className="mt-4 text-base text-slate-500 leading-relaxed">
          Ping is stripped of heavy weight. Here is how the workspace is structured to coordinate direct and group channels.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
        
        {/* Card 1: Passwordless Registry */}
        <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex h-36 items-center justify-center rounded-xl bg-slate-50 border border-slate-100 overflow-hidden p-4 select-none mb-6">
            <div className="w-full flex flex-col gap-2">
              <span className="font-mono text-[9px] text-slate-400 uppercase tracking-wide">Secure Login</span>
              <div className="relative border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-xs text-slate-700 flex items-center justify-between">
                <span>
                  {phoneState === "empty" && ""}
                  {phoneState === "typing" && "+1 (555) 012"}
                  {(phoneState === "submitting" || phoneState === "done") && "+1 (555) 012-9831"}
                </span>
                {phoneState === "typing" && <span className="w-1 h-3.5 bg-slate-800 animate-pulse"></span>}
                {phoneState === "submitting" && <span className="text-[10px] text-slate-400">Verifying...</span>}
                {phoneState === "done" && <span className="text-[10px] text-[#34C759] font-bold">Done</span>}
              </div>
              <span className="text-[10px] text-slate-550 leading-normal text-center min-h-[30px] text-slate-500">
                {phoneState === "empty" && "Ready for registration"}
                {phoneState === "typing" && "Analyzing digits..."}
                {phoneState === "submitting" && "Contacting registry database..."}
                {phoneState === "done" && "Logged in. Profile registered!"}
              </span>
            </div>
          </div>
          <h3 className="text-base font-bold text-[#1D1D1F]">Passwordless Registry</h3>
          <p className="mt-2 text-xs text-slate-500 leading-relaxed">
            Enter your phone. Set a name. You are in. The system registers new numbers automatically behind the scenes so there is never a password to remember.
          </p>
        </div>

        {/* Card 2: Asymmetric Groups */}
        <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex h-36 items-center justify-center rounded-xl bg-slate-50 border border-slate-100 overflow-hidden p-4 select-none mb-6">
            <div className="w-full flex flex-col gap-2">
              <span className="font-mono text-[9px] text-slate-400 uppercase tracking-wide">Workspace Registry</span>
              <div className="flex flex-col gap-1 border border-slate-200 rounded-lg p-2 bg-white min-h-[60px]">
                <span className="text-[10px] font-bold text-slate-800">Ping Group Chat</span>
                <div className="flex flex-wrap gap-1">
                  {groupMembers.map((member) => (
                    <span key={member} className="bg-slate-100 text-slate-650 rounded-full px-2 py-0.5 text-[9px] font-medium text-slate-600">
                      {member}
                    </span>
                  ))}
                  <span className="text-[9px] text-slate-450 font-bold animate-pulse py-0.5 text-slate-400">
                    {groupMembers.length < 3 ? "+ Adding..." : ""}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <h3 className="text-base font-bold text-[#1D1D1F]">Direct & Group Spaces</h3>
          <p className="mt-2 text-xs text-slate-500 leading-relaxed">
            Search by name, select your participants, and begin. Instantly scale from a single conversation to a multi-member group workspace with full admin controls.
          </p>
        </div>

        {/* Card 3: Realtime Delivery */}
        <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex h-36 items-center justify-center rounded-xl bg-slate-50 border border-slate-100 overflow-hidden p-4 select-none mb-6">
            <div className="w-full flex flex-col gap-2 relative">
              <span className="font-mono text-[9px] text-slate-400 uppercase tracking-wide">Network Latency</span>
              <div className="flex flex-col items-center justify-center border border-slate-200 rounded-lg p-3 bg-white min-h-[60px]">
                <span className="font-mono text-xl font-extrabold tracking-tight text-slate-800">4.2ms</span>
                <span className="text-[9px] text-slate-450 mt-1 uppercase text-slate-400">Message Signal {deliveryCount}</span>
              </div>
            </div>
          </div>
          <h3 className="text-base font-bold text-[#1D1D1F]">Socket.io Signal</h3>
          <p className="mt-2 text-xs text-slate-500 leading-relaxed">
            Driven by Socket.io. Delivery is instant and normalized, updates happen immediately across active clients, and connection status is visible at all times.
          </p>
        </div>

        {/* Card 4: Intelligent Auto-scroll */}
        <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex h-36 items-center justify-center rounded-xl bg-slate-50 border border-slate-100 overflow-hidden p-4 select-none mb-6">
            <div className="w-full flex flex-col gap-2">
              <span className="font-mono text-[9px] text-slate-400 uppercase tracking-wide">Viewport Lock</span>
              <div className="border border-slate-200 rounded-lg bg-white p-2 flex flex-col gap-1 min-h-[60px] relative overflow-hidden">
                <div className="h-full flex flex-col gap-1 text-[8px] opacity-40">
                  <div className="bg-slate-100 h-2 w-3/4 rounded"></div>
                  <div className="bg-slate-100 h-2 w-1/2 rounded"></div>
                </div>
                <div className="absolute inset-x-0 bottom-1 flex justify-center">
                  <span className="bg-slate-800 text-white rounded-full px-2 py-0.5 text-[8px] font-bold tracking-wide uppercase shadow">
                    Pinned
                  </span>
                </div>
              </div>
            </div>
          </div>
          <h3 className="text-base font-bold text-[#1D1D1F]">Considerate Anchoring</h3>
          <p className="mt-2 text-xs text-slate-500 leading-relaxed">
            Read history without disruption. The viewport stays pinned to the latest message by default, but stays anchored where you are if you scroll up to read past messages.
          </p>
        </div>

      </div>
    </section>
  );
}

const styleTag = (
  <style dangerouslySetInnerHTML={{ __html: `
    @keyframes pulseAuth {
      0%, 100% { opacity: 0.3; }
      50% { opacity: 1; }
    }
    @keyframes slideMsg {
      from { transform: translateY(8px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
  ` }} />
);
