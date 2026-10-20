import { badRequest, notFound } from "../../lib/errors.js";
import { formatIssues } from "../../lib/validate.js";
import { emitMessageNew } from "../../realtime/emitter.js";
import { Conversation } from "../conversations/conversation.model.js";
import { Message, type MessageRecord } from "./message.model.js";

const SYNC_BATCH = 100;

export function serializeMessage(message: MessageRecord) {
  return {
    _id: message._id.toString(),
    conversation: message.conversation.toString(),
    sender: message.sender.toString(),
    text: message.text,
    createdAt: message.createdAt.toISOString(),
    seq: message.seq,
    ...(message.clientMessageId && { clientMessageId: message.clientMessageId }),
  };
}

function invalidBefore() {
  return badRequest("Invalid request", [{ path: "before", message: "must be a message of this conversation" }]);
}

export async function getHistory(userId: string, conversationId: string, limit: number, before?: string) {
  if (!(await Conversation.exists({ _id: conversationId, participants: userId }))) {
    throw notFound("Conversation not found");
  }

  let beforeSeq: number | undefined;
  if (before) {
    const anchor = await Message.findOne({ _id: before, conversation: conversationId }, "seq").lean();
    if (anchor?.seq === undefined) throw invalidBefore();
    beforeSeq = anchor.seq;
  }

  const rows = await Message.find({
    conversation: conversationId,
    ...(beforeSeq !== undefined && { seq: { $lt: beforeSeq } }),
  })
    .sort({ seq: -1 })
    .limit(limit + 1)
    .lean();

  return { messages: rows.slice(0, limit).map(serializeMessage), hasMore: rows.length > limit };
}

function isClientMessageIdCollision(error: unknown) {
  const { code, keyPattern } = error as { code?: number; keyPattern?: Record<string, unknown> };
  return code === 11000 && keyPattern?.clientMessageId !== undefined;
}

async function findExisting(senderId: string, conversationId: string, clientMessageId: string) {
  const existing = await Message.findOne({ sender: senderId, clientMessageId }).lean();
  if (!existing) return null;
  if (existing.conversation.toString() !== conversationId) {
    throw badRequest("clientMessageId already used", [
      { path: "clientMessageId", message: "already used for another conversation" },
    ]);
  }
  return existing;
}

/** Shared by the REST route and the socket handler. Retrying with the same clientMessageId is safe. */
export async function sendMessage(senderId: string, conversationId: string, text: string, clientMessageId?: string) {
  if (clientMessageId) {
    const existing = await findExisting(senderId, conversationId, clientMessageId);
    if (existing) return serializeMessage(existing);
  }

  // The atomic increment is also the participant check.
  const conversation = await Conversation.findOneAndUpdate(
    { _id: conversationId, participants: senderId },
    { $inc: { lastSeq: 1 } },
    { new: true, projection: "participants lastSeq" },
  ).lean();
  if (!conversation) throw notFound("Conversation not found");

  let message;
  try {
    message = await Message.create({
      conversation: conversationId,
      sender: senderId,
      text,
      seq: conversation.lastSeq,
      ...(clientMessageId && { clientMessageId }),
    });
  } catch (error) {
    // A concurrent identical retry won the race. The seq allocated above is burned; gaps are allowed.
    if (clientMessageId && isClientMessageIdCollision(error)) {
      const existing = await findExisting(senderId, conversationId, clientMessageId);
      if (existing) return serializeMessage(existing);
    }
    throw error;
  }

  await Conversation.updateOne(
    { _id: conversationId },
    { $set: { lastMessage: { text: message.text, sender: message.sender, createdAt: message.createdAt } } },
  );

  emitMessageNew(
    conversation.participants.map((id) => id.toString()).filter((id) => id !== senderId),
    {
      id: message._id.toString(),
      conversation: conversationId,
      sender: senderId,
      text: message.text,
      createdAt: message.createdAt.getTime(),
      seq: message.seq,
    },
  );

  return serializeMessage(message.toObject());
}

export interface SyncCursor {
  conversationId: string;
  afterSeq: number;
}

async function syncCursor(userId: string, { conversationId, afterSeq }: SyncCursor) {
  if (!(await Conversation.exists({ _id: conversationId, participants: userId }))) {
    return { conversationId, messages: [], complete: false };
  }
  const rows = await Message.find({ conversation: conversationId, seq: { $gt: afterSeq } })
    .sort({ seq: 1 })
    .limit(SYNC_BATCH + 1)
    .lean();
  return {
    conversationId,
    messages: rows.slice(0, SYNC_BATCH).map(serializeMessage),
    complete: rows.length <= SYNC_BATCH,
  };
}

/** Missed messages per conversation, for a client that reconnected. Bounded by the 100-cursor schema cap. */
export async function syncMessages(userId: string, cursors: SyncCursor[]) {
  const results = [];
  for (const cursor of cursors) results.push(await syncCursor(userId, cursor));
  return results;
}
