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

/**
 * POST /conversations/group (verified: 201 with the full group object).
 * Only the verified `_id` is depended on; the sidebar row comes from the
 * refetched conversation list.
 */
export interface CreatedGroup {
  _id: string;
}

export function createGroup(name: string, participantIds: string[]) {
  return apiClient.post<CreatedGroup>("/conversations/group", { name, participantIds });
}
