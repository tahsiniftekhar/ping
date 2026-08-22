import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";

export const metadata = {
  title: "Sign in — Ping",
};

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-1 flex-col items-center justify-center bg-[#F5F5F3] px-6 py-12 selection:bg-[#2878F0] selection:text-white">
      <div className="w-full max-w-sm rounded-[24px] border border-[#171717]/[0.08] bg-[#FAFAF8] p-8 shadow-[0_8px_32px_rgba(23,23,23,0.03)] sm:p-10">
        {/* Brand header */}
        <div className="mb-8 flex flex-col items-center text-center">
          <Link href="/" className="group mb-5 flex items-center gap-2">
            <span className="size-2 rounded-full bg-[#2878F0]" />
            <span className="text-xl font-bold tracking-tight text-[#171717]">
              Ping
            </span>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-[#171717]">Welcome</h1>
          <p className="mt-2 text-xs text-[#626262] leading-relaxed">
            Enter your phone number to sign in. New accounts are registered automatically.
          </p>
        </div>

        <LoginForm />
      </div>

      {/* Subtle back link */}
      <div className="mt-8 text-center">
        <Link 
          href="/" 
          className="text-xs font-medium text-[#8A8A86] transition-colors hover:text-[#171717]"
        >
          &larr; Back to home
        </Link>
      </div>
    </main>
  );
}
