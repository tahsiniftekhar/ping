"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ConversationList } from "@/components/chat/conversation-list";
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
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col overflow-hidden md:my-4 md:max-h-[calc(100vh-2rem)] md:flex-row md:rounded-xl md:border">
      <aside className="flex min-h-0 flex-col border-b md:w-80 md:shrink-0 md:border-r md:border-b-0">
        <header className="flex items-center justify-between gap-2 border-b px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{user?.name}</p>
            <p className="text-muted-foreground truncate text-xs">{user?.phone}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              logout();
              router.replace("/login");
            }}
          >
            Sign out
          </Button>
        </header>
        <ConversationList />
      </aside>
      <section className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
        <h2 className="text-base font-medium">Select a conversation</h2>
        <p className="text-muted-foreground text-sm">
          Your messages will appear here once conversations can be opened.
        </p>
      </section>
    </main>
  );
}
