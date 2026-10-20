import { notFound } from "../../lib/errors.js";
import { emitMessageNew } from "../../realtime/emitter.js";
import { Conversation } from "../conversations/conversation.model.js";
import { Message, type MessageRecord } from "./message.model.js";

export function serializeMessage(message: MessageRecord) {
  return {
    _id: message._id.toString(),
    conversation: message.conversation.toString(),
    sender: message.sender.toString(),
    text: message.text,
    createdAt: message.createdAt.toISOString(),
  };
}

export async function getHistory(userId: string, conversationId: string, limit: number, before?: string) {
  if (!(await Conversation.exists({ _id: conversationId, participants: userId }))) {
    throw notFound("Conversation not found");
  }

  const rows = await Message.find({
    conversation: conversationId,
    ...(before && { _id: { $lt: before } }),
  })
    .sort({ _id: -1 })
    .limit(limit + 1)
    .lean();

  return { messages: rows.slice(0, limit).map(serializeMessage), hasMore: rows.length > limit };
}

/** Shared by the REST route and the socket handler. */
export async function sendMessage(senderId: string, conversationId: string, text: string) {
  const conversation = await Conversation.findOne({ _id: conversationId, participants: senderId }, "participants").lean();
  if (!conversation) throw notFound("Conversation not found");

  const message = await Message.create({ conversation: conversationId, sender: senderId, text });
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
    },
  );

  return serializeMessage(message.toObject());
}
