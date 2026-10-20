import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export const metadata = {
  title: "Sign in",
};

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen flex-1 flex-col items-center justify-center bg-background px-6 py-12 selection:bg-brand selection:text-white">
      <ThemeToggle className="absolute top-4 right-4" />
      <div className="w-full max-w-sm rounded-[24px] border border-foreground/[0.08] bg-card p-8 shadow-[0_8px_32px_rgba(23,23,23,0.03)] sm:p-10">
        {/* Brand header */}
        <div className="mb-8 flex flex-col items-center text-center">
          <Link href="/" className="group mb-5 flex items-center gap-2">
            <span className="size-2 rounded-full bg-brand" />
            <span className="text-xl font-bold tracking-tight text-foreground">
              Ping
            </span>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Welcome</h1>
          <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
            Enter your phone number to sign in. New accounts are registered automatically.
          </p>
        </div>

        <LoginForm />
      </div>

      <p className="mt-6 max-w-sm text-center text-[11px] text-subtle">
        No password needed — your phone number is your account.
      </p>

      {/* Subtle back link */}
      <div className="mt-8 text-center">
        <Link 
          href="/" 
          className="text-xs font-medium text-subtle transition-colors hover:text-foreground"
        >
          &larr; Back to home
        </Link>
      </div>
    </main>
  );
}
