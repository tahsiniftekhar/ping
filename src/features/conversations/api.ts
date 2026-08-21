import { apiClient } from "@/lib/api/client";
import type { ConversationListResponse } from "@/types/api";

export function fetchConversations() {
  return apiClient.get<ConversationListResponse>("/conversations");
}

/**
 * POST /conversations opens (or creates) a 1-to-1 conversation — idempotent.
 * Verified response shape; the full conversation comes from the refetched list.
 */
export interface StartedConversation {
  _id: string;
  participants: string[];
  createdAt: string;
}

export function startDirectConversation(userId: string) {
  return apiClient.post<StartedConversation>("/conversations", { userId });
}
