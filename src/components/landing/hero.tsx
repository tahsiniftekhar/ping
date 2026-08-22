"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Hero() {
  const handleScrollToHowItWorks = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative mx-auto flex w-full max-w-[1280px] flex-col justify-center px-6 pt-12 pb-20 sm:px-8 sm:pt-16 sm:pb-24 lg:min-h-[780px] lg:px-12 lg:pt-20 lg:pb-28">
      {/* Motion keyframes scoped with prefers-reduced-motion support */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(14px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes floatRestrained1 {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        @keyframes floatRestrained2 {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes floatRestrained3 {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-5px); }
        }
        @keyframes floatRestrained4 {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-7px); }
        }
        @keyframes pulseDot {
          0%, 100% {
            opacity: 0.3;
            transform: translateY(0);
          }
          50% {
            opacity: 1;
            transform: translateY(-2px);
          }
        }
        .hero-reveal {
          opacity: 0;
          animation: fadeInUp 0.75s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .hero-float-1 {
          animation: floatRestrained1 7s ease-in-out infinite;
        }
        .hero-float-2 {
          animation: floatRestrained2 8.5s ease-in-out infinite 0.5s;
        }
        .hero-float-3 {
          animation: floatRestrained3 6.5s ease-in-out infinite 1s;
        }
        .hero-float-4 {
          animation: floatRestrained4 7.5s ease-in-out infinite 1.5s;
        }
        .typing-dot-1 {
          animation: pulseDot 1.3s infinite ease-in-out;
        }
        .typing-dot-2 {
          animation: pulseDot 1.3s infinite ease-in-out 0.2s;
        }
        .typing-dot-3 {
          animation: pulseDot 1.3s infinite ease-in-out 0.4s;
        }
        
        @media (prefers-reduced-motion: reduce) {
          .hero-reveal,
          .hero-float-1,
          .hero-float-2,
          .hero-float-3,
          .hero-float-4,
          .typing-dot-1,
          .typing-dot-2,
          .typing-dot-3 {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }
      `}} />

      <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-8 xl:gap-12">
        {/* Left Column: Typography & Narrative */}
        <div className="flex flex-col items-start lg:col-span-6 xl:col-span-6">
          {/* Eyebrow */}
          <div 
            className="hero-reveal mb-5 flex items-center gap-2"
            style={{ animationDelay: "50ms" }}
          >
            <span className="size-1.5 rounded-full bg-[#2878F0]" />
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#1D63C8]">
              Realtime conversation
            </span>
          </div>

          {/* Large Headline */}
          <h1 
            className="hero-reveal text-5xl font-extrabold tracking-[-0.035em] text-[#171717] sm:text-6xl md:text-7xl lg:text-[4.75rem] xl:text-[5.25rem] leading-[0.98] mb-6"
            style={{ animationDelay: "150ms" }}
          >
            Conversations<br className="hidden sm:inline" /> that stay in<br className="hidden sm:inline" /> motion.
          </h1>

          {/* Description */}
          <p 
            className="hero-reveal text-base sm:text-lg text-[#626262] leading-relaxed max-w-lg mb-8"
            style={{ animationDelay: "250ms" }}
          >
            A realtime space for the conversations that matter. Talk directly. Gather in groups. Stay connected.
          </p>

          {/* Actions */}
          <div 
            className="hero-reveal flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto"
            style={{ animationDelay: "350ms" }}
          >
            <Link
              href="/chat"
              className={cn(
                buttonVariants({ variant: "default", size: "lg" }),
                "rounded-full px-8 py-3.5 bg-[#171717] hover:bg-[#171717]/90 text-white font-medium text-sm transition-all active:scale-[0.98] shadow-none"
              )}
            >
              Open the conversation &rarr;
            </Link>
            <a
              href="#how-it-works"
              onClick={handleScrollToHowItWorks}
              className="inline-flex h-11 items-center justify-center px-4 text-sm font-medium text-[#626262] hover:text-[#171717] transition-colors"
            >
              See how it works &darr;
            </a>
          </div>
        </div>

        {/* Right Column: Asymmetric Conversation Composition */}
        <div 
          className="hero-reveal relative flex flex-col justify-center items-center lg:col-span-6 xl:col-span-6 w-full select-none"
          style={{ animationDelay: "450ms" }}
        >
          <div className="relative flex flex-col gap-5 w-full max-w-xl py-6 sm:py-10">
            
            {/* Bubble 1: Incoming Left (with presence indicator) */}
            <div className="hero-float-1 flex items-start gap-3.5 max-w-[88%] self-start translate-x-1 sm:translate-x-4">
              <div className="relative flex size-9 shrink-0 items-center justify-center rounded-full bg-[#EAEAE7] text-xs font-semibold text-[#171717] border border-[#171717]/[0.08]">
                T
                <span className="absolute bottom-0 right-0 block size-2.5 rounded-full bg-[#34C759] ring-2 ring-[#F5F5F3]" />
              </div>
              <div className="rounded-[18px] rounded-tl-sm bg-[#FAFAF8] border border-[#171717]/[0.08] px-4.5 py-3 shadow-[0_2px_12px_rgba(23,23,23,0.03)] text-[#171717]">
                <p className="text-sm font-medium leading-snug">
                  Shall we gather here?
                </p>
                <span className="mt-1 block text-[10px] text-[#8A8A86] text-right font-mono">11:20 AM</span>
              </div>
            </div>

            {/* Bubble 2: Outgoing Right */}
            <div className="hero-float-2 flex items-start gap-3.5 max-w-[88%] self-end -translate-x-2 sm:-translate-x-6">
              <div className="rounded-[18px] rounded-tr-sm bg-[#171717] px-4.5 py-3 shadow-[0_4px_16px_rgba(23,23,23,0.06)] text-white">
                <p className="text-sm font-medium leading-snug">
                  Sounds good. I&apos;ll invite the others.
                </p>
                <span className="mt-1 block text-[10px] text-white/50 text-right font-mono">11:21 AM</span>
              </div>
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#171717] text-xs font-semibold text-white shadow-sm">
                You
              </div>
            </div>

            {/* Bubble 3: Incoming Left */}
            <div className="hero-float-3 flex items-start gap-3.5 max-w-[88%] self-start translate-x-4 sm:translate-x-12">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#EAEAE7] text-xs font-semibold text-[#171717] border border-[#171717]/[0.08]">
                A
              </div>
              <div className="rounded-[18px] rounded-tl-sm bg-[#FAFAF8] border border-[#171717]/[0.08] px-4.5 py-3 shadow-[0_2px_12px_rgba(23,23,23,0.03)] text-[#171717]">
                <p className="text-sm font-medium leading-snug">
                  I&apos;m in as well. Let&apos;s get started.
                </p>
                <span className="mt-1 block text-[10px] text-[#8A8A86] text-right font-mono">11:21 AM</span>
              </div>
            </div>

            {/* Bubble 4: Typing Indicator Left */}
            <div className="hero-float-4 flex items-start gap-3.5 max-w-[88%] self-start translate-x-2 sm:translate-x-5">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#EAEAE7] text-xs font-semibold text-[#171717] border border-[#171717]/[0.08]">
                M
              </div>
              <div className="flex items-center gap-1.5 rounded-[18px] rounded-tl-sm bg-[#FAFAF8] border border-[#171717]/[0.08] px-5 py-3.5 shadow-[0_2px_12px_rgba(23,23,23,0.03)]">
                <span className="typing-dot-1 block size-1.5 rounded-full bg-[#8A8A86]" />
                <span className="typing-dot-2 block size-1.5 rounded-full bg-[#8A8A86]" />
                <span className="typing-dot-3 block size-1.5 rounded-full bg-[#8A8A86]" />
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
