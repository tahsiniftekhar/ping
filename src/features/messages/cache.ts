import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import { messageKeys } from "@/features/messages/queries";
import type { SocketMessageNew, SyncCursor } from "@/lib/socket/types";
import type { Message, MessageHistoryResponse } from "@/types/api";

type History = InfiniteData<MessageHistoryResponse>;

/**
 * Normalizes a socket message into the REST message shape (the presentation
 * model): `id` → `_id`, epoch millis → ISO string. This is the only place the
 * two timestamp/id forms are bridged for the cache.
 */
export function fromSocketMessage(message: SocketMessageNew): Message {
  return {
    _id: message.id,
    conversation: message.conversation,
    sender: message.sender,
    text: message.text,
    createdAt: new Date(message.createdAt).toISOString(),
    ...(message.seq !== undefined && { seq: message.seq }),
  };
}

/** Newest first. `seq` decides when both sides have one; time is the legacy fallback. */
function newestFirst(a: Message, b: Message): number {
  if (a.seq !== undefined && b.seq !== undefined) return b.seq - a.seq;
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

/**
 * Adds server messages to a conversation's newest history page. Duplicate ids
 * are ignored and pagination cursors are untouched. Unloaded histories are
 * skipped — their first fetch includes the messages. The updater form reads
 * the latest cache value, so a concurrent refetch cannot be clobbered.
 */
export function insertMessages(queryClient: QueryClient, conversationId: string, messages: Message[]) {
  if (messages.length === 0) return;
  queryClient.setQueryData<History | undefined>(messageKeys.history(conversationId), (existing) => {
    if (!existing || existing.pages.length === 0) return existing;

    const known = new Set(existing.pages.flatMap((page) => page.messages.map((message) => message._id)));
    const fresh = messages.filter((message) => !known.has(message._id));
    if (fresh.length === 0) return existing;

    const [first, ...rest] = existing.pages;
    return {
      ...existing,
      pages: [{ ...first, messages: [...fresh, ...first.messages].sort(newestFirst) }, ...rest],
    };
  });
}

/** Highest `seq` held for a conversation, or undefined when unknown (legacy data or not loaded). */
export function latestSeq(queryClient: QueryClient, conversationId: string): number | undefined {
  const history = queryClient.getQueryData<History>(messageKeys.history(conversationId));
  let max: number | undefined;
  for (const page of history?.pages ?? []) {
    for (const message of page.messages) {
      if (message.seq !== undefined && (max === undefined || message.seq > max)) max = message.seq;
    }
  }
  return max;
}

/**
 * Replay cursors for every loaded history. A loaded history with no messages
 * yet has seen nothing, so it asks from 0; one without `seq` data cannot be
 * resumed and is reported separately for a plain refetch.
 */
export function collectSyncCursors(queryClient: QueryClient): { cursors: SyncCursor[]; unresumable: string[] } {
  const cursors: SyncCursor[] = [];
  const unresumable: string[] = [];
  for (const [key, data] of queryClient.getQueriesData<History>({ queryKey: messageKeys.all })) {
    const conversationId = key[2];
    if (typeof conversationId !== "string" || !data) continue;
    const hasMessages = data.pages.some((page) => page.messages.length > 0);
    const seq = latestSeq(queryClient, conversationId);
    if (seq !== undefined) cursors.push({ conversationId, afterSeq: seq });
    else if (!hasMessages) cursors.push({ conversationId, afterSeq: 0 });
    else unresumable.push(conversationId);
  }
  return { cursors, unresumable };
}
