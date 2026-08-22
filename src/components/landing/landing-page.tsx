import { LandingNav } from "@/components/landing/landing-nav";
import { Hero } from "@/components/landing/hero";
import { PhilosophySection } from "@/components/landing/philosophy-section";
import { FeaturesSection } from "@/components/landing/features-section";
import { ConversationShowcase } from "@/components/landing/conversation-showcase";
import { FinalCta } from "@/components/landing/final-cta";
import { LandingFooter } from "@/components/landing/landing-footer";

export function LandingPage() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-[#F5F5F3] text-[#171717] selection:bg-[#2878F0] selection:text-white">
      <LandingNav />
      <main className="flex-1 flex flex-col">
        <Hero />
        <PhilosophySection />
        <FeaturesSection />
        <ConversationShowcase />
        <FinalCta />
      </main>
      <LandingFooter />
    </div>
  );
}
