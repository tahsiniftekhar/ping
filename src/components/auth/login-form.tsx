"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/providers/auth-provider";
import { Button } from "@/components/ui/button";

export function LoginForm() {
  const { login, isAuthenticated } = useAuth();
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) router.replace("/chat");
  }, [isAuthenticated, router]);

  const canSubmit = phone.trim() !== "" && name.trim() !== "" && !submitting;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await login(phone.trim(), name.trim());
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

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-4" noValidate>
      <div className="flex flex-col gap-2">
        <label htmlFor="phone" className="text-sm font-medium">
          Phone number
        </label>
        <input
          id="phone"
          type="tel"
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          disabled={submitting}
          placeholder="+15551234567"
          className="border-input bg-background h-10 rounded-md border px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="name" className="text-sm font-medium">
          Name
        </label>
        <input
          id="name"
          type="text"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={submitting}
          placeholder="Ada Lovelace"
          className="border-input bg-background h-10 rounded-md border px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          required
        />
      </div>

      {error !== null && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}

      <Button type="submit" disabled={!canSubmit}>
        {submitting ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
