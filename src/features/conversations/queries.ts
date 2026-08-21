import { useQuery } from "@tanstack/react-query";
import { fetchConversations } from "@/features/conversations/api";

export const conversationKeys = {
  all: ["conversations"] as const,
};

export function useConversations() {
  return useQuery({
    queryKey: conversationKeys.all,
    queryFn: fetchConversations,
    // Conversations change rarely; the socket will keep this fresh later.
    staleTime: 60_000,
  });
}
