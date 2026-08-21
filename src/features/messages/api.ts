import { apiClient } from "@/lib/api/client";
import type { MessageHistoryResponse } from "@/types/api";

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
