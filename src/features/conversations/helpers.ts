import type { Conversation, LastMessage, User } from "@/types/api";

export function conversationTitle(conversation: Conversation): string {
  return conversation.type === "group" ? conversation.name : conversation.participant.name;
}

/**
 * Sidebar preview from `lastMessage`, which the API returns as `{}` when the
 * conversation has no messages yet.
 */
export function lastMessagePreview(lastMessage: LastMessage, currentUserId: string): string {
  if (!lastMessage.text) return "No messages yet";
  const senderPrefix =
    lastMessage.sender === currentUserId ? "You: " : "";
  return `${senderPrefix}${lastMessage.text}`;
}

/** Compact relative label for the sidebar: time today, date otherwise. */
export function conversationTimestamp(conversation: Conversation): string {
  const date = new Date(conversation.updatedAt);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (sameDay) {
    return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** The other participant(s) beside the current user — used for later features. */
export function otherParticipants(conversation: Conversation, currentUserId: string): User[] {
  if (conversation.type === "direct") return [conversation.participant];
  return conversation.participants.filter((participant) => participant._id !== currentUserId);
}
