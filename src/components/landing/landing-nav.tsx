import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils";

export function LandingNav() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-foreground/[0.06] bg-background/85 backdrop-blur-md transition-all">
      <nav className="mx-auto flex h-[72px] max-w-[1280px] items-center justify-between px-6 sm:px-8 lg:px-12">
        {/* Wordmark Left */}
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="flex size-2 rounded-full bg-brand" />
          <span className="text-xl font-bold tracking-tight text-foreground">
            Ping
          </span>
        </Link>

        {/* Minimal Navigation Center (Desktop) */}
        <div className="hidden items-center gap-8 md:flex">
          <a
            href="#philosophy"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Philosophy
          </a>
          <a
            href="#how-it-works"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            How it works
          </a>
          <a
            href="#showcase"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Showcase
          </a>
        </div>

        {/* Primary CTA Right */}
        <div className="flex items-center gap-3">
          <ThemeToggle className="hidden sm:inline-flex" />
          <Link
            href="/chat"
            className={cn(
              buttonVariants({ variant: "default", size: "default" }),
              "h-9 rounded-full bg-foreground px-5 text-xs font-semibold text-background shadow-none transition-all hover:bg-foreground/90 active:scale-[0.98]"
            )}
          >
            Open Chat
          </Link>
        </div>
      </nav>
    </header>
  );
}
