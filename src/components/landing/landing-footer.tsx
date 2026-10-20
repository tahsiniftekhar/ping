import Link from "next/link";

export function LandingFooter() {
  return (
    <footer className="w-full border-t border-foreground/[0.08] bg-background py-8">
      <div className="mx-auto flex max-w-[1280px] flex-col items-center justify-between gap-4 px-6 sm:flex-row sm:px-8 lg:px-12 text-xs text-subtle">
        <p>&copy; {new Date().getFullYear()} Ping. Realtime chat sandbox.</p>
        <div className="flex items-center gap-6">
          <Link 
            href="/chat" 
            className="transition-colors hover:text-foreground"
          >
            Chat
          </Link>
          <Link 
            href="/login" 
            className="transition-colors hover:text-foreground"
          >
            Login
          </Link>
        </div>
      </div>
    </footer>
  );
}
