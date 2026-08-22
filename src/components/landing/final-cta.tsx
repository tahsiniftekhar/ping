import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function FinalCta() {
  return (
    <section className="relative mx-auto w-full max-w-[1280px] px-6 py-20 sm:px-8 sm:py-28 lg:px-12 lg:py-32">
      <div className="relative overflow-hidden rounded-[28px] bg-[#171717] px-8 py-16 text-center sm:px-12 sm:py-20 lg:py-24 shadow-[0_16px_48px_rgba(0,0,0,0.12)]">
        
        {/* Subtle Accent Glow */}
        <div 
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(40,120,240,0.12),transparent_50%)]" 
          aria-hidden="true" 
        />

        <div className="relative z-10 mx-auto flex max-w-2xl flex-col items-center gap-6">
          {/* Eyebrow */}
          <div className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-[#2878F0]" />
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#2878F0]">
              Get Started
            </span>
          </div>

          {/* Headline */}
          <h2 className="text-3xl font-extrabold tracking-[-0.035em] text-white sm:text-4xl lg:text-5xl leading-[1.08]">
            Realtime messaging,<br />without the friction.
          </h2>

          {/* Description */}
          <p className="max-w-md text-sm sm:text-base text-white/60 leading-relaxed">
            No passwords. No unnecessary complexity. Just open a conversation.
          </p>

          {/* CTA Button */}
          <div className="mt-2 flex items-center justify-center">
            <Link
              href="/chat"
              className={cn(
                buttonVariants({ variant: "default", size: "lg" }),
                "h-12 rounded-full bg-white px-8 text-sm font-semibold text-[#171717] shadow-none transition-all hover:bg-white/90 active:scale-[0.98]"
              )}
            >
              Open Ping &rarr;
            </Link>
          </div>
        </div>

      </div>
    </section>
  );
}
