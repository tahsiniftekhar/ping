"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { LogOut, MessagesSquare, Search, SquarePen, Users, X } from "lucide-react";
import { ConversationList } from "@/components/chat/conversation-list";
import { MessagePanel } from "@/components/chat/message-panel";
import { NewConversationDialog } from "@/components/chat/new-conversation-dialog";
import { NewGroupDialog } from "@/components/chat/new-group-dialog";
import { Avatar } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { matchesConversationQuery, sortByActivity } from "@/features/conversations/helpers";
import { useConversations } from "@/features/conversations/queries";
import { isUnread, useReadState } from "@/features/conversations/read-state";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { useSocket } from "@/providers/socket-provider";
import type { User } from "@/types/api";

type Filter = "all" | "direct" | "group";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "direct", label: "Direct" },
  { value: "group", label: "Groups" },
];

const noopSubscribe = () => () => {};

function WorkspaceLoading({ label = "Loading workspace…" }: { label?: string }) {
  return (
    <main className="flex h-dvh flex-1 items-center justify-center bg-background">
      <div className="flex items-center gap-2 font-mono text-xs text-subtle">
        <span className="size-2 animate-pulse rounded-full bg-brand" />
        <span>{label}</span>
      </div>
    </main>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<WorkspaceLoading />}>
      <ChatWorkspace />
    </Suspense>
  );
}

function ChatWorkspace() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const hydrated = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace("/login");
  }, [isLoading, isAuthenticated, router]);

  if (!hydrated || isLoading) return <WorkspaceLoading />;
  if (!isAuthenticated || !user) return <WorkspaceLoading label="Redirecting…" />;

  return <Workspace user={user} />;
}

function ConnectionPill() {
  const { connected } = useSocket();
  return (
    <span
      role="status"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold",
        connected ? "bg-success/10 text-success" : "bg-amber-500/10 text-amber-600 dark:text-amber-400",
      )}
    >
      <span
        className={cn("size-1.5 rounded-full", connected ? "bg-success" : "animate-pulse bg-amber-500")}
        aria-hidden
      />
      {connected ? "Live" : "Connecting"}
    </span>
  );
}

function Workspace({ user }: { user: User }) {
  const { logout } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("c");

  const { data, isPending, isError, error, refetch } = useConversations();
  const { state: readState, markRead } = useReadState(user._id);

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [newConversationOpen, setNewConversationOpen] = useState(false);
  const [newGroupOpen, setNewGroupOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const conversations = useMemo(() => sortByActivity(data?.data ?? []), [data]);
  const selectedConversation = conversations.find((conversation) => conversation._id === selectedId) ?? null;

  const unreadIds = useMemo(
    () =>
      new Set(
        conversations
          .filter((conversation) => isUnread(conversation, user._id, readState))
          .map((conversation) => conversation._id),
      ),
    [conversations, user._id, readState],
  );
  const unreadCount = [...unreadIds].filter((id) => id !== selectedId).length;

  const visibleConversations = conversations.filter(
    (conversation) =>
      (filter === "all" || conversation.type === filter) && matchesConversationQuery(conversation, query),
  );

  const selectConversation = useCallback(
    (conversationId: string | null) => {
      const url = conversationId ? `/chat?c=${conversationId}` : "/chat";
      // Push when opening from the list so the mobile back gesture returns to it.
      if (conversationId && !selectedId) router.push(url, { scroll: false });
      else router.replace(url, { scroll: false });
    },
    [router, selectedId],
  );

  // Opening a conversation, or receiving a message while it is open, marks it read.
  const selectedActivity = selectedConversation?.lastMessage.createdAt;
  useEffect(() => {
    if (selectedConversation) markRead(selectedConversation);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-run only on selection or new activity
  }, [selectedConversation?._id, selectedActivity, markRead]);

  // A stale or foreign `?c=` (left group, bad link) falls back to the list.
  useEffect(() => {
    if (selectedId && data && !selectedConversation) router.replace("/chat", { scroll: false });
  }, [selectedId, data, selectedConversation, router]);

  useEffect(() => {
    document.title = unreadCount > 0 ? `(${unreadCount}) Ping` : "Chats — Ping";
  }, [unreadCount]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function handleSignOut() {
    logout();
    router.replace("/login");
  }

  return (
    <div className="flex h-dvh w-full bg-background md:p-4 selection:bg-brand selection:text-white">
      <main className="mx-auto flex w-full max-w-[1400px] flex-1 overflow-hidden bg-card md:rounded-[24px] md:border md:border-foreground/[0.08] md:shadow-[0_8px_32px_rgba(23,23,23,0.04)]">
        <aside
          className={cn(
            "min-h-0 w-full flex-col border-foreground/[0.08] md:flex md:w-[340px] md:shrink-0 md:border-r",
            selectedConversation ? "hidden" : "flex",
          )}
        >
          <header className="flex items-center justify-between gap-3 px-4 pt-4 pb-3">
            <div className="flex items-center gap-2.5">
              <Link href="/" className="flex items-center gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
                <span className="size-2 rounded-full bg-brand" />
                <span className="text-lg font-bold tracking-tight text-foreground">Ping</span>
              </Link>
              <ConnectionPill />
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setNewGroupOpen(true)}
                aria-label="New group"
                title="New group"
                className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors outline-none hover:bg-foreground/[0.06] hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand/40"
              >
                <Users className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setNewConversationOpen(true)}
                aria-label="New chat"
                title="New chat"
                className="flex size-8 items-center justify-center rounded-full bg-foreground text-background transition-transform outline-none hover:bg-foreground/90 focus-visible:ring-2 focus-visible:ring-brand/40 active:scale-95"
              >
                <SquarePen className="size-3.5" />
              </button>
            </div>
          </header>

          <div className="px-3 pb-2">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-subtle" aria-hidden />
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    setQuery("");
                    event.currentTarget.blur();
                  }
                }}
                placeholder="Search conversations"
                aria-label="Search conversations"
                autoComplete="off"
                className="h-9 w-full rounded-full border border-foreground/[0.08] bg-surface pr-12 pl-8.5 text-[13px] text-foreground outline-none placeholder:text-subtle transition-colors focus:border-brand/60 focus:ring-2 focus:ring-brand/20"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  className="absolute top-1/2 right-2 flex size-5 -translate-y-1/2 items-center justify-center rounded-full text-subtle hover:bg-foreground/[0.06] hover:text-foreground"
                >
                  <X className="size-3" />
                </button>
              ) : (
                <kbd className="pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 font-mono text-[10px] text-subtle md:block">
                  ⌘K
                </kbd>
              )}
            </div>

            <div role="tablist" aria-label="Filter conversations" className="mt-2 flex gap-1">
              {FILTERS.map(({ value, label }) => {
                const active = filter === value;
                const count = conversations.filter(
                  (conversation) =>
                    (value === "all" || conversation.type === value) &&
                    unreadIds.has(conversation._id) &&
                    conversation._id !== selectedId,
                ).length;
                return (
                  <button
                    key={value}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setFilter(value)}
                    className={cn(
                      "inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
                      active
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:bg-foreground/[0.05] hover:text-foreground",
                    )}
                  >
                    {label}
                    {count > 0 && (
                      <span
                        className={cn(
                          "min-w-4 rounded-full px-1 text-center text-[10px] leading-4 tabular-nums",
                          active ? "bg-background/20" : "bg-brand text-white",
                        )}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <ConversationList
            conversations={visibleConversations}
            filtered={conversations.length > 0}
            isPending={isPending}
            isError={isError}
            error={error}
            onRetry={() => void refetch()}
            onNewChat={() => setNewConversationOpen(true)}
            selectedId={selectedId}
            onSelect={selectConversation}
            currentUserId={user._id}
            unreadIds={unreadIds}
          />

          <footer className="flex items-center gap-3 border-t border-foreground/[0.08] px-4 py-3">
            <Avatar name={user.name} seed={user._id} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-foreground">{user.name}</p>
              <p className="truncate font-mono text-[10px] text-subtle">{user.phone}</p>
            </div>
            <ThemeToggle />
            <button
              type="button"
              onClick={handleSignOut}
              aria-label="Sign out"
              title="Sign out"
              className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors outline-none hover:bg-destructive/10 hover:text-destructive focus-visible:ring-2 focus-visible:ring-brand/40"
            >
              <LogOut className="size-4" />
            </button>
          </footer>
        </aside>

        {selectedConversation ? (
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <MessagePanel
              key={selectedConversation._id}
              conversation={selectedConversation}
              currentUserId={user._id}
              onConversationLeft={() => selectConversation(null)}
              onBack={() => selectConversation(null)}
            />
          </div>
        ) : (
          <section className="hidden min-h-0 flex-1 flex-col items-center justify-center gap-4 bg-background/40 p-8 text-center md:flex">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-brand/10 text-brand">
              <MessagesSquare className="size-6" aria-hidden />
            </span>
            <div>
              <h2 className="text-base font-bold tracking-tight text-foreground">Your conversations</h2>
              <p className="mt-1.5 max-w-xs text-xs leading-relaxed text-muted-foreground">
                Pick a chat from the sidebar, or start something new.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setNewConversationOpen(true)}
                className="inline-flex h-9 items-center gap-2 rounded-full bg-foreground px-4 text-xs font-semibold text-background transition-transform hover:bg-foreground/90 active:scale-[0.98]"
              >
                <SquarePen className="size-3.5" aria-hidden /> New chat
              </button>
              <button
                type="button"
                onClick={() => setNewGroupOpen(true)}
                className="inline-flex h-9 items-center gap-2 rounded-full border border-foreground/[0.1] bg-surface px-4 text-xs font-semibold text-foreground transition-colors hover:bg-foreground/[0.04]"
              >
                <Users className="size-3.5" aria-hidden /> New group
              </button>
            </div>
            <p className="font-mono text-[10px] text-subtle">
              <kbd>⌘K</kbd> to search
            </p>
          </section>
        )}

        <NewConversationDialog
          open={newConversationOpen}
          onOpenChange={setNewConversationOpen}
          onConversationOpened={selectConversation}
        />
        <NewGroupDialog open={newGroupOpen} onOpenChange={setNewGroupOpen} onGroupCreated={selectConversation} />
      </main>
    </div>
  );
}
