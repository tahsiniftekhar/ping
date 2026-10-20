import { Schema, model, type Types } from "mongoose";

export interface MessageRecord {
  _id: Types.ObjectId;
  conversation: Types.ObjectId;
  sender: Types.ObjectId;
  text: string;
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<MessageRecord>(
  {
    conversation: { type: Schema.Types.ObjectId, ref: "Conversation", required: true },
    sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true, trim: true, minlength: 1, maxlength: 4000 },
  },
  { timestamps: true },
);

messageSchema.index({ conversation: 1, _id: -1 });

export const Message = model<MessageRecord>("Message", messageSchema);
