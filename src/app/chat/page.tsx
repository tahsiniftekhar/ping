"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ConversationList } from "@/components/chat/conversation-list";
import { MessagePanel } from "@/components/chat/message-panel";
import { NewConversationDialog } from "@/components/chat/new-conversation-dialog";
import { NewGroupDialog } from "@/components/chat/new-group-dialog";
import { useConversations } from "@/features/conversations/queries";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/providers/auth-provider";

const noopSubscribe = () => () => {};

export default function ChatPage() {
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const hydrated = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  const { data, isPending, isError, error, refetch } = useConversations();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [newConversationOpen, setNewConversationOpen] = useState(false);
  const [newGroupOpen, setNewGroupOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace("/login");
  }, [isLoading, isAuthenticated, router]);

  if (!hydrated || isLoading) {
    return (
      <main className="flex flex-1 items-center justify-center bg-[#F5F5F3]">
        <div className="flex items-center gap-2 font-mono text-xs text-[#8A8A86]">
          <span className="size-2 rounded-full bg-[#2878F0] animate-pulse" />
          <span>Loading workspace…</span>
        </div>
      </main>
    );
  }

  if (!isAuthenticated || !user) return null;

  const conversations = data?.data ?? [];
  const selectedConversation =
    conversations.find((conversation) => conversation._id === selectedConversationId) ?? null;

  return (
    <div className="flex min-h-screen w-full flex-col bg-[#F5F5F3] p-0 md:p-6 selection:bg-[#2878F0] selection:text-white">
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col overflow-hidden bg-[#FAFAF8] md:h-[calc(100vh-3rem)] md:flex-row md:rounded-[24px] md:border md:border-[#171717]/[0.08] shadow-[0_8px_32px_rgba(23,23,23,0.03)]">
        
        {/* Sidebar */}
        <aside className="flex min-h-0 flex-col border-b border-[#171717]/[0.08] md:w-80 md:shrink-0 md:border-r md:border-b-0">
          
          {/* Header */}
          <header className="flex items-center justify-between gap-3 border-b border-[#171717]/[0.08] px-5 py-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Link href="/" className="size-2 rounded-full bg-[#2878F0]" title="Home" />
                <p className="truncate text-sm font-bold tracking-tight text-[#171717]">{user.name}</p>
              </div>
              <p className="font-mono text-[11px] text-[#8A8A86] truncate mt-0.5">{user.phone}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 rounded-full px-3 text-xs font-medium text-[#626262] hover:bg-[#171717]/[0.05] hover:text-[#171717]"
              onClick={() => {
                logout();
                router.replace("/login");
              }}
            >
              Sign out
            </Button>
          </header>

          {/* New Chat / Group Actions */}
          <div className="flex gap-2 border-b border-[#171717]/[0.08] p-3">
            <button
              type="button"
              className="flex-1 rounded-full bg-[#171717]/[0.05] hover:bg-[#171717]/[0.09] py-1.5 text-xs font-semibold text-[#171717] transition-colors"
              onClick={() => setNewConversationOpen(true)}
            >
              + New chat
            </button>
            <button
              type="button"
              className="flex-1 rounded-full bg-[#171717]/[0.05] hover:bg-[#171717]/[0.09] py-1.5 text-xs font-semibold text-[#171717] transition-colors"
              onClick={() => setNewGroupOpen(true)}
            >
              + New group
            </button>
          </div>

          {/* Conversation List */}
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

        {/* Message Panel or Empty State */}
        {selectedConversation ? (
          <MessagePanel
            conversation={selectedConversation}
            currentUserId={user._id}
            onConversationLeft={() => setSelectedConversationId(null)}
          />
        ) : (
          <section className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-8 text-center bg-[#F5F5F3]/30">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-[#EAEAE7] text-[#171717] text-lg mb-2 shadow-sm border border-[#171717]/[0.06]">
              💬
            </div>
            <h2 className="text-base font-bold tracking-tight text-[#171717]">Select a conversation</h2>
            <p className="max-w-xs text-xs text-[#626262] leading-relaxed">
              Pick a conversation from the sidebar or start a new direct or group space.
            </p>
          </section>
        )}

        {/* Dialogs */}
        <NewConversationDialog
          open={newConversationOpen}
          onOpenChange={setNewConversationOpen}
          onConversationOpened={setSelectedConversationId}
        />
        <NewGroupDialog
          open={newGroupOpen}
          onOpenChange={setNewGroupOpen}
          onGroupCreated={setSelectedConversationId}
        />
      </main>
    </div>
  );
}
