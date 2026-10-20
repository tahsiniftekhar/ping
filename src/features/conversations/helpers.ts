import type { Conversation, LastMessage, User } from "@/types/api";

export function conversationTitle(conversation: Conversation): string {
  return conversation.type === "group" ? conversation.name : conversation.participant.name;
}

/**
 * Sidebar preview from `lastMessage`, which the API returns as `{}` when the
 * conversation has no messages yet.
 */
export function lastMessagePreview(conversation: Conversation, currentUserId: string): string {
  const { lastMessage } = conversation;
  if (!lastMessage.text) return "No messages yet";
  return `${senderPrefix(conversation, lastMessage, currentUserId)}${lastMessage.text}`;
}

function senderPrefix(conversation: Conversation, lastMessage: LastMessage, currentUserId: string) {
  if (lastMessage.sender === currentUserId) return "You: ";
  if (conversation.type !== "group") return "";
  const sender = conversation.participants.find((participant) => participant._id === lastMessage.sender);
  return sender ? `${sender.name.split(" ")[0]}: ` : "";
}

/** Recency for ordering: last message time, falling back to `updatedAt`. */
export function conversationActivity(conversation: Conversation): number {
  const time = new Date(conversation.lastMessage.createdAt ?? conversation.updatedAt).getTime();
  return Number.isNaN(time) ? 0 : time;
}

/** Most recently active first. The API's list ordering is not verified, so sort client-side. */
export function sortByActivity(conversations: Conversation[]): Conversation[] {
  return [...conversations].sort((a, b) => conversationActivity(b) - conversationActivity(a));
}

/** Compact sidebar label: time today, "Yesterday", weekday this week, date otherwise. */
export function conversationTimestamp(conversation: Conversation): string {
  const time = conversationActivity(conversation);
  if (time === 0) return "";
  const date = new Date(time);

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const dayMs = 86_400_000;

  if (time >= startOfToday.getTime()) {
    return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }
  if (time >= startOfToday.getTime() - dayMs) return "Yesterday";
  if (time >= startOfToday.getTime() - 6 * dayMs) {
    return date.toLocaleDateString(undefined, { weekday: "short" });
  }
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Case-insensitive match on the title and, for groups, member names. */
export function matchesConversationQuery(conversation: Conversation, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  if (conversationTitle(conversation).toLowerCase().includes(needle)) return true;
  return conversation.type === "group"
    ? conversation.participants.some((participant) => participant.name.toLowerCase().includes(needle))
    : conversation.participant.phone.includes(needle);
}

/** The other participant(s) beside the current user. */
export function otherParticipants(conversation: Conversation, currentUserId: string): User[] {
  if (conversation.type === "direct") return [conversation.participant];
  return conversation.participants.filter((participant) => participant._id !== currentUserId);
}
