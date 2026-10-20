import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchMessages } from "@/features/messages/api";
import type { Message } from "@/types/api";

export const messageKeys = {
  all: ["messages"] as const,
  /**
   * History for one conversation. Kept granular (conversation id) so the
   * socket layer can patch a single conversation's cache later.
   */
  history: (conversationId: string) => ["messages", "history", conversationId] as const,
};

const PAGE_SIZE = 30;

/**
 * Cursor-paginated message history. Pages come back newest-first from the API;
 * consumers read `messages` (oldest→newest, already normalized).
 */
export function useMessageHistory(conversationId: string | null) {
  return useInfiniteQuery({
    queryKey: messageKeys.history(conversationId ?? "none"),
    queryFn: ({ pageParam }) =>
      fetchMessages(conversationId as string, {
        limit: PAGE_SIZE,
        before: pageParam === undefined ? undefined : pageParam,
      }),
    enabled: conversationId !== null,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      if (!lastPage.hasMore || lastPage.messages.length === 0) return undefined;
      // API is newest-first: the cursor is the oldest message of the newest batch.
      return lastPage.messages[lastPage.messages.length - 1]._id;
    },
    // Pages are immutable history; only the first page changes with new messages.
    staleTime: 60_000,
  });
}

/** Flattened pages → oldest→newest messages for display. */
export function chronologicMessages(pages: { messages: Message[] }[]) {
  return pages.flatMap((page) => page.messages).reverse();
}
