export function PhilosophySection() {
  return (
    <section 
      id="philosophy" 
      className="relative mx-auto w-full max-w-[1280px] border-t border-[#171717]/[0.08] px-6 py-24 sm:px-8 sm:py-32 lg:px-12 lg:py-36"
    >
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-16 items-start">
        {/* Left Column: Label */}
        <div className="lg:col-span-4">
          <div className="sticky top-28 flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-[#171717]" />
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#8A8A86]">
              Conversation, without the noise.
            </span>
          </div>
        </div>

        {/* Right Column: Statement & Thoughtful Narrative */}
        <div className="flex flex-col gap-8 lg:col-span-8 max-w-2xl">
          <h2 className="text-3xl font-bold tracking-[-0.03em] text-[#171717] sm:text-4xl lg:text-[2.75rem] leading-[1.12]">
            &ldquo;Good communication shouldn&apos;t require learning another complicated system.&rdquo;
          </h2>

          <div className="flex flex-col gap-5 text-base sm:text-lg text-[#626262] leading-relaxed">
            <p>
              Ping is deliberately simple. No unnecessary layers. No overloaded workspace. Just people, conversations, and the context around them.
            </p>
            <p className="text-sm sm:text-base text-[#8A8A86]">
              Designed around the immediacy of a direct connection and the natural rhythm of human conversation.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
