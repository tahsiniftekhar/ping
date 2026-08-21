import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createGroup,
  fetchConversations,
  startDirectConversation,
} from "@/features/conversations/api";

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

/**
 * Opens/creates a direct conversation and invalidates the list rather than
 * appending — POST /conversations may return an existing conversation, so the
 * refetched list stays the source of truth. Resolves with the conversation id
 * for callers to select it.
 */
export function useStartDirectConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => startDirectConversation(userId),
    onSuccess: async (conversation) => {
      await queryClient.invalidateQueries({ queryKey: conversationKeys.all });
      return conversation._id;
    },
  });
}

/**
 * Creates a group and invalidates the list (the sidebar row comes from the
 * refetch). Resolves with the new conversation id for callers to select.
 */
export function useCreateGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, participantIds }: { name: string; participantIds: string[] }) =>
      createGroup(name, participantIds),
    onSuccess: async (group) => {
      await queryClient.invalidateQueries({ queryKey: conversationKeys.all });
      return group._id;
    },
  });
}
