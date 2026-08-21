"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/providers/auth-provider";

export default function ChatPage() {
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace("/login");
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground text-sm">Loading…</p>
      </main>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-semibold">Chat</h1>
      <p className="text-muted-foreground text-sm">
        Signed in as {user?.name} ({user?.phone}). Conversations arrive in the next step.
      </p>
      <Button
        variant="outline"
        onClick={() => {
          logout();
          router.replace("/login");
        }}
      >
        Sign out
      </Button>
    </main>
  );
}
