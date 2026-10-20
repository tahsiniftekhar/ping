/**
 * VERIFIED Socket.io event payload types (live probe 2026-08-21 — docs/API.md).
 * Field names match the transport exactly; do not rename.
 */
import type { Message } from "@/types/api";

/** Server → client `message:new`. `createdAt` is epoch milliseconds. */
export interface SocketMessageNew {
  id: string;
  conversation: string;
  sender: string;
  text: string;
  createdAt: number;
  /** Self-hosted server only (docs/delivery.md). */
  seq?: number;
}

/** Server → client `conversation:updated`. Full group conversation object. */
export interface SocketConversationUpdated {
  _id: string;
  type: "group";
  name: string;
  createdBy: string;
  admins: string[];
  participants: { _id: string; name: string; phone: string }[];
}

/**
 * Ack for client → server `message:send`. The hosted API acks `{ ok: true }`
 * with no message; the self-hosted server adds the stored `message`.
 */
export type MessageSendAck = { ok: true; message?: Message } | { ok: false; error: string };

/**
 * Self-hosted server only (docs/delivery.md). Emitted once per connection;
 * the hosted API never sends it, which is how the client detects legacy mode.
 */
export interface ServerHello {
  protocol: number;
  features: string[];
}

export const DELIVERY_FEATURES = ["idempotent-send", "message-seq", "sync"] as const;

/** Client → server `messages:sync`: the last `seq` seen per conversation. */
export interface SyncCursor {
  conversationId: string;
  afterSeq: number;
}

export type SyncAck =
  | {
      ok: true;
      results: { conversationId: string; messages: Message[]; complete: boolean }[];
    }
  | { ok: false; error: string };
