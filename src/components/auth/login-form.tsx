"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Loader2 } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/providers/auth-provider";

const PHONE_PATTERN = /^\+?\d{7,15}$/;
const SLOW_SUBMIT_MS = 4000;

export function LoginForm() {
  const { login, isAuthenticated } = useAuth();
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSlowNote, setShowSlowNote] = useState(false);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAuthenticated) router.replace("/chat");
  }, [isAuthenticated, router]);

  useEffect(() => {
    phoneInputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!submitting) return;
    const timer = setTimeout(() => setShowSlowNote(true), SLOW_SUBMIT_MS);
    return () => {
      clearTimeout(timer);
      setShowSlowNote(false);
    };
  }, [submitting]);

  async function handleSubmit(event?: FormEvent) {
    if (event) {
      event.preventDefault();
    }

    const normalizedPhone = phone.replace(/[\s\-()]/g, "");
    const trimmedName = name.trim();

    if (!normalizedPhone) {
      setError("Please enter your phone number.");
      phoneInputRef.current?.focus();
      return;
    }

    if (!PHONE_PATTERN.test(normalizedPhone)) {
      setError("Enter a valid phone number, e.g. +15551234567.");
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
      await login(normalizedPhone, trimmedName);
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
        <label htmlFor="phone" className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
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
          className="h-10 rounded-xl border border-foreground/10 bg-surface px-3.5 text-sm text-foreground placeholder:text-subtle outline-none transition-colors focus:border-brand focus:ring-1 focus:ring-brand disabled:opacity-50"
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
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
          maxLength={40}
          className="h-10 rounded-xl border border-foreground/10 bg-surface px-3.5 text-sm text-foreground placeholder:text-subtle outline-none transition-colors focus:border-brand focus:ring-1 focus:ring-brand disabled:opacity-50"
          required
        />
      </div>

      {error !== null && (
        <div role="alert" className="rounded-xl border border-destructive/25 bg-destructive/10 p-2.5 text-center text-xs text-destructive">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-full bg-foreground text-xs font-semibold text-background shadow-none transition-all hover:bg-foreground/90 active:scale-[0.98] disabled:opacity-50"
      >
        {submitting ? (
          <>
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
            Signing in…
          </>
        ) : (
          "Sign in →"
        )}
      </button>

      {showSlowNote && (
        <p role="status" className="text-center text-[11px] leading-relaxed text-muted-foreground">
          Waking up the server — the first sign-in can take up to a minute.
        </p>
      )}
    </form>
  );
}
