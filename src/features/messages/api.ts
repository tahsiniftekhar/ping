import { apiClient } from "@/lib/api/client";
import type { Message, MessageHistoryResponse } from "@/types/api";

export interface FetchMessagesOptions {
  limit: number;
  /** Cursor: the `_id` of the oldest loaded message; fetches messages older than it. */
  before?: string;
}

export function fetchMessages(conversationId: string, options: FetchMessagesOptions) {
  const searchParams: Record<string, string> = { limit: String(options.limit) };
  if (options.before) searchParams.before = options.before;
  return apiClient.get<MessageHistoryResponse>(
    `/conversations/${conversationId}/messages`,
    { searchParams },
  );
}

/**
 * REST send, used when the socket is down. Verified: 200 with the persisted
 * message on success, but 200 with `null` for an unknown conversation.
 */
export function postMessage(conversationId: string, text: string, clientMessageId?: string) {
  return apiClient.post<Message | null>("/messages", {
    conversationId,
    text,
    ...(clientMessageId && { clientMessageId }),
  });
}
