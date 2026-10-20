import type { Server } from "socket.io";

let io: Server | undefined;

export function setIo(server: Server | undefined) {
  io = server;
}

export const userRoom = (userId: string) => `user:${userId}`;

export interface MessageNewPayload {
  id: string;
  conversation: string;
  sender: string;
  text: string;
  createdAt: number;
}

export function emitMessageNew(recipientIds: string[], payload: MessageNewPayload) {
  if (!io || recipientIds.length === 0) return;
  io.to(recipientIds.map(userRoom)).emit("message:new", payload);
}

export function emitConversationUpdated(recipientIds: string[], payload: unknown) {
  if (!io || recipientIds.length === 0) return;
  io.to(recipientIds.map(userRoom)).emit("conversation:updated", payload);
}
