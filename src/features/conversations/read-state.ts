"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { Conversation } from "@/types/api";

/**
 * Client-only "last read" timestamps per conversation, persisted in
 * localStorage per user. The API has no read state, so unread is derived by
 * comparing each conversation's `lastMessage.createdAt` with these marks.
 * A per-user baseline (first time this browser saw the account) keeps old
 * history from showing up as unread on first use.
 */
interface ReadState {
  baseline: number;
  marks: Record<string, number>;
}

const listeners = new Set<() => void>();
const cache = new Map<string, ReadState>();
const EMPTY: ReadState = { baseline: Number.POSITIVE_INFINITY, marks: {} };

function storageKey(userId: string) {
  return `ping.read.${userId}`;
}

function load(userId: string): ReadState {
  const cached = cache.get(userId);
  if (cached) return cached;

  let state: ReadState = { baseline: Date.now(), marks: {} };
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ReadState>;
      if (typeof parsed.baseline === "number" && parsed.marks && typeof parsed.marks === "object") {
        state = { baseline: parsed.baseline, marks: parsed.marks };
      }
    } else {
      window.localStorage.setItem(storageKey(userId), JSON.stringify(state));
    }
  } catch {
    // Unavailable storage: unread tracking lives for this page view only.
  }
  cache.set(userId, state);
  return state;
}

function save(userId: string, state: ReadState) {
  cache.set(userId, state);
  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify(state));
  } catch {
    // See load().
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (!event.key?.startsWith("ping.read.")) return;
    cache.clear();
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function lastMessageTime(conversation: Conversation): number | null {
  const { createdAt } = conversation.lastMessage;
  if (!createdAt) return null;
  const time = new Date(createdAt).getTime();
  return Number.isNaN(time) ? null : time;
}

export function isUnread(conversation: Conversation, currentUserId: string, state: ReadState): boolean {
  const time = lastMessageTime(conversation);
  if (time === null || conversation.lastMessage.sender === currentUserId) return false;
  return time > (state.marks[conversation._id] ?? state.baseline);
}

export function useReadState(userId: string) {
  const state = useSyncExternalStore(
    subscribe,
    () => load(userId),
    () => EMPTY,
  );

  const markRead = useCallback(
    (conversation: Conversation) => {
      const current = load(userId);
      // Client and server clocks can disagree; never mark earlier than the message itself.
      const at = Math.max(Date.now(), lastMessageTime(conversation) ?? 0);
      if ((current.marks[conversation._id] ?? 0) >= at) return;
      save(userId, { ...current, marks: { ...current.marks, [conversation._id]: at } });
    },
    [userId],
  );

  return { state, markRead };
}
