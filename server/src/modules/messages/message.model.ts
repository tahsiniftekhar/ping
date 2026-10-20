import { Schema, model, type Types } from "mongoose";

export interface MessageRecord {
  _id: Types.ObjectId;
  conversation: Types.ObjectId;
  sender: Types.ObjectId;
  text: string;
  seq: number;
  clientMessageId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<MessageRecord>(
  {
    conversation: { type: Schema.Types.ObjectId, ref: "Conversation", required: true },
    sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true, trim: true, minlength: 1, maxlength: 4000 },
    // Not required: messages that predate sequencing get one from `npm run migrate:seq`.
    seq: { type: Number },
    clientMessageId: { type: String },
  },
  { timestamps: true },
);

messageSchema.index(
  { conversation: 1, seq: 1 },
  { unique: true, partialFilterExpression: { seq: { $exists: true } } },
);
messageSchema.index(
  { sender: 1, clientMessageId: 1 },
  { unique: true, partialFilterExpression: { clientMessageId: { $type: "string" } } },
);

export const Message = model<MessageRecord>("Message", messageSchema);
