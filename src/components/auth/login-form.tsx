"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/providers/auth-provider";

export function LoginForm() {
  const { login, isAuthenticated } = useAuth();
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAuthenticated) router.replace("/chat");
  }, [isAuthenticated, router]);

  async function handleSubmit(event?: FormEvent) {
    if (event) {
      event.preventDefault();
    }

    const trimmedPhone = phone.trim();
    const trimmedName = name.trim();

    if (!trimmedPhone) {
      setError("Please enter your phone number.");
      phoneInputRef.current?.focus();
      return;
    }

    if (!trimmedName) {
      setError("Please enter your name.");
      nameInputRef.current?.focus();
      return;
    }

    if (submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      await login(trimmedPhone, trimmedName);
      router.replace("/chat");
    } catch (cause) {
      if (cause instanceof ApiError) {
        setError(cause.message);
      } else {
        setError("Something went wrong. Please try again.");
      }
      setSubmitting(false);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      void handleSubmit();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="phone" className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#626262]">
          Phone number
        </label>
        <input
          ref={phoneInputRef}
          id="phone"
          type="tel"
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={submitting}
          placeholder="+15551234567"
          className="h-10 rounded-xl border border-[#171717]/10 bg-white px-3.5 text-sm text-[#171717] placeholder:text-[#8A8A86] outline-none transition-colors focus:border-[#2878F0] focus:ring-1 focus:ring-[#2878F0] disabled:opacity-50"
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#626262]">
          Your name
        </label>
        <input
          ref={nameInputRef}
          id="name"
          type="text"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={submitting}
          placeholder="Ada Lovelace"
          className="h-10 rounded-xl border border-[#171717]/10 bg-white px-3.5 text-sm text-[#171717] placeholder:text-[#8A8A86] outline-none transition-colors focus:border-[#2878F0] focus:ring-1 focus:ring-[#2878F0] disabled:opacity-50"
          required
        />
      </div>

      {error !== null && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-2.5 text-center text-xs text-red-600">
          {error}
        </div>
      )}

      <button 
        type="submit" 
        disabled={submitting}
        className="mt-2 flex h-10 w-full items-center justify-center rounded-full bg-[#171717] text-xs font-semibold text-white shadow-none transition-all hover:bg-[#171717]/90 active:scale-[0.98] disabled:opacity-50"
      >
        {submitting ? "Signing in…" : "Sign in \u2192"}
      </button>
    </form>
  );
}
