"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ConversationList } from "@/components/chat/conversation-list";
import { MessagePanel } from "@/components/chat/message-panel";
import { NewConversationDialog } from "@/components/chat/new-conversation-dialog";
import { useConversations } from "@/features/conversations/queries";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/providers/auth-provider";

export default function ChatPage() {
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const { data, isPending, isError, error, refetch } = useConversations();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [newConversationOpen, setNewConversationOpen] = useState(false);

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

  if (!isAuthenticated || !user) return null;

  const conversations = data?.data ?? [];
  const selectedConversation =
    conversations.find((conversation) => conversation._id === selectedConversationId) ?? null;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col overflow-hidden md:my-4 md:max-h-[calc(100vh-2rem)] md:flex-row md:rounded-xl md:border">
      <aside className="flex min-h-0 flex-col border-b md:w-80 md:shrink-0 md:border-r md:border-b-0">
        <header className="flex items-center justify-between gap-2 border-b px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{user.name}</p>
            <p className="text-muted-foreground truncate text-xs">{user.phone}</p>
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
        <div className="border-b p-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setNewConversationOpen(true)}
          >
            New conversation
          </Button>
        </div>
        <ConversationList
          conversations={conversations}
          isPending={isPending}
          isError={isError}
          error={error}
          onRetry={() => refetch()}
          selectedId={selectedConversationId}
          onSelect={setSelectedConversationId}
          currentUserId={user._id}
        />
      </aside>
      {selectedConversation ? (
        <MessagePanel conversation={selectedConversation} currentUserId={user._id} />
      ) : (
        <section className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
          <h2 className="text-base font-medium">Select a conversation</h2>
          <p className="text-muted-foreground text-sm">
            Pick a conversation to see its messages.
          </p>
        </section>
      )}
      <NewConversationDialog
        open={newConversationOpen}
        onOpenChange={setNewConversationOpen}
        onConversationOpened={setSelectedConversationId}
      />
    </main>
  );
}
