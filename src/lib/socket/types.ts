/**
 * VERIFIED Socket.io event payload types (live probe 2026-08-21 — docs/API.md).
 * Field names match the transport exactly; do not rename.
 */

/** Server → client `message:new`. `createdAt` is epoch milliseconds. */
export interface SocketMessageNew {
  id: string;
  conversation: string;
  sender: string;
  text: string;
  createdAt: number;
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

/** Ack for client → server `message:send`. Contains NO server message id. */
export type MessageSendAck = { ok: true } | { ok: false; error: string };
