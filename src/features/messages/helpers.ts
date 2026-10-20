import type { Message } from "@/types/api";
import type { PendingMessage } from "@/features/messages/use-send-message";

/**
 * REST history sends ISO-8601 strings; the socket's `message:new` sends epoch
 * milliseconds. Both known forms are handled — nothing more.
 */
export function messageTimestamp(value: string | number): Date {
  return new Date(value);
}

export function messageTimeLabel(value: string | number): string {
  const date = messageTimestamp(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

const RUN_GAP_MS = 5 * 60_000;
const DEDUPE_WINDOW_MS = 60_000;
const DAY_MS = 86_400_000;

export interface TimelineMessage {
  key: string;
  text: string;
  sender: string;
  createdAt: number;
  outgoing: boolean;
  local?: PendingMessage;
}

export type TimelineItem =
  | { kind: "date"; key: string; label: string }
  | { kind: "message"; message: TimelineMessage; firstInRun: boolean; lastInRun: boolean };

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function isSameDay(a: number, b: number): boolean {
  return startOfDay(new Date(a)) === startOfDay(new Date(b));
}

/** "Today", "Yesterday", weekday within the last week, otherwise a full date. */
export function dateSeparatorLabel(value: number, now: Date = new Date()): string {
  const date = new Date(value);
  const diffDays = Math.round((startOfDay(now) - startOfDay(date)) / DAY_MS);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays > 1 && diffDays < 7) return date.toLocaleDateString(undefined, { weekday: "long" });
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Merges server history with local sends. Each server message absorbs at most
 * one local message, so identical repeated texts are not collapsed. Failed
 * local messages always stay visible.
 */
export function mergeMessages(
  server: Message[],
  pending: PendingMessage[],
  currentUserId: string,
): TimelineMessage[] {
  const used = new Set<string>();
  const visibleLocal = pending.filter((item) => {
    if (item.status === "failed") return true;
    const match = server.find(
      (message) =>
        !used.has(message._id) &&
        message.sender === item.sender &&
        message.text === item.text &&
        Math.abs(messageTimestamp(message.createdAt).getTime() - item.createdAt) < DEDUPE_WINDOW_MS,
    );
    if (match) used.add(match._id);
    return !match;
  });

  const fromServer: TimelineMessage[] = server.map((message) => ({
    key: message._id,
    text: message.text,
    sender: message.sender,
    createdAt: messageTimestamp(message.createdAt).getTime(),
    outgoing: message.sender === currentUserId,
  }));
  const fromLocal: TimelineMessage[] = visibleLocal.map((item) => ({
    key: item.clientId,
    text: item.text,
    sender: item.sender,
    createdAt: item.createdAt,
    outgoing: item.sender === currentUserId,
    local: item,
  }));
  return [...fromServer, ...fromLocal].sort((a, b) => a.createdAt - b.createdAt);
}

function sameRun(a: TimelineMessage, b: TimelineMessage): boolean {
  return (
    a.sender === b.sender && b.createdAt - a.createdAt <= RUN_GAP_MS && isSameDay(a.createdAt, b.createdAt)
  );
}

/** Inserts date separators and marks first/last message of each same-sender run. */
export function buildTimeline(messages: TimelineMessage[], now: Date = new Date()): TimelineItem[] {
  const items: TimelineItem[] = [];
  messages.forEach((message, index) => {
    const previous = messages[index - 1];
    const next = messages[index + 1];
    if (!previous || !isSameDay(previous.createdAt, message.createdAt)) {
      items.push({
        kind: "date",
        key: `date-${startOfDay(new Date(message.createdAt))}`,
        label: dateSeparatorLabel(message.createdAt, now),
      });
    }
    items.push({
      kind: "message",
      message,
      firstInRun: !previous || !sameRun(previous, message),
      lastInRun: !next || !sameRun(message, next),
    });
  });
  return items;
}

export interface TextSegment {
  text: string;
  href?: string;
}

const URL_PATTERN = /((?:https?:\/\/|www\.)[^\s<]+)/gi;
const TRAILING_PUNCTUATION = /[.,;:!?)\]}'"]+$/;

/** Splits text into plain and link segments; links are rendered as elements, never as HTML. */
export function linkify(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  for (const part of text.split(URL_PATTERN)) {
    if (part === "") continue;
    if (!/^(?:https?:\/\/|www\.)/i.test(part)) {
      segments.push({ text: part });
      continue;
    }
    const trailing = part.match(TRAILING_PUNCTUATION)?.[0] ?? "";
    const url = trailing ? part.slice(0, -trailing.length) : part;
    segments.push({ text: url, href: /^www\./i.test(url) ? `https://${url}` : url });
    if (trailing) segments.push({ text: trailing });
  }
  return segments;
}

/** Group subtitle such as "Ada, Bob, You +2". */
export function memberSummary(
  members: { _id: string; name: string }[],
  currentUserId: string,
  visible = 3,
): string {
  const names = members.map((member) => (member._id === currentUserId ? "You" : member.name));
  if (names.length <= visible) return names.join(", ");
  return `${names.slice(0, visible).join(", ")} +${names.length - visible}`;
}
