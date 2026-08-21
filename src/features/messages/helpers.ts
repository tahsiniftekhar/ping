/**
 * Presentation helper for message timestamps. REST history sends ISO-8601
 * strings; the socket's `message:new` sends epoch milliseconds. Both known
 * forms are handled — nothing more.
 */
export function messageTimestamp(value: string | number): Date {
  return typeof value === "number" ? new Date(value) : new Date(value);
}

/** Short label for a message bubble: time only (date shown via grouping later if needed). */
export function messageTimeLabel(value: string | number): string {
  const date = messageTimestamp(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}
