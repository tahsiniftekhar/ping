import { apiClient } from "@/lib/api/client";
import type { ConversationListResponse } from "@/types/api";

export function fetchConversations() {
  return apiClient.get<ConversationListResponse>("/conversations");
}
