/**
 * Gives messages that predate per-conversation sequence numbers a `seq`, and sets
 * each conversation's `lastSeq`. Legacy messages are numbered in _id order (the only
 * ordering legacy data has), continuing after whatever seq the conversation already uses.
 * Safe to run repeatedly. Needs only MONGODB_URI.
 */
import { pathToFileURL } from "node:url";
import mongoose from "mongoose";
import { Conversation } from "../modules/conversations/conversation.model.js";
import { Message } from "../modules/messages/message.model.js";

async function backfillConversation(conversationId: mongoose.Types.ObjectId, lastSeq: number) {
  const [top] = await Message.find({ conversation: conversationId, seq: { $exists: true } }, "seq")
    .sort({ seq: -1 })
    .limit(1)
    .lean();
  let seq = Math.max(lastSeq, top?.seq ?? 0);

  const legacy = await Message.find({ conversation: conversationId, seq: { $exists: false } }, "_id")
    .sort({ _id: 1 })
    .lean();
  if (legacy.length > 0) {
    await Message.bulkWrite(
      legacy.map((message) => ({ updateOne: { filter: { _id: message._id }, update: { $set: { seq: ++seq } } } })),
      { timestamps: false },
    );
  }

  if (seq !== lastSeq) {
    await Conversation.updateOne({ _id: conversationId }, { $set: { lastSeq: seq } }, { timestamps: false });
  }
  return legacy.length;
}

/** Returns how many messages were numbered. */
export async function backfillSeq() {
  let numbered = 0;
  for await (const conversation of Conversation.find({}, "lastSeq").lean().cursor()) {
    numbered += await backfillConversation(conversation._id, conversation.lastSeq ?? 0);
  }
  return numbered;
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is required");
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 });
  await Message.syncIndexes();
  console.log(`Backfill complete: ${await backfillSeq()} messages numbered.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
    .then(() => mongoose.disconnect())
    .catch(async (err) => {
      console.error(err);
      await mongoose.disconnect().catch(() => {});
      process.exit(1);
    });
}
