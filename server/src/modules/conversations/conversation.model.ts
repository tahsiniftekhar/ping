import { Schema, model, type Types } from "mongoose";

export interface LastMessageRecord {
  text: string;
  sender: Types.ObjectId;
  createdAt: Date;
}

export interface ConversationRecord {
  _id: Types.ObjectId;
  type: "direct" | "group";
  participants: Types.ObjectId[];
  name?: string;
  createdBy?: Types.ObjectId;
  admins: Types.ObjectId[];
  directKey?: string;
  lastMessage?: LastMessageRecord;
  createdAt: Date;
  updatedAt: Date;
}

const conversationSchema = new Schema<ConversationRecord>(
  {
    type: { type: String, enum: ["direct", "group"], required: true },
    participants: { type: [{ type: Schema.Types.ObjectId, ref: "User" }], index: true },
    name: { type: String, trim: true, maxlength: 50 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    admins: [{ type: Schema.Types.ObjectId, ref: "User" }],
    directKey: { type: String, unique: true, sparse: true },
    lastMessage: {
      type: new Schema(
        {
          text: { type: String, required: true },
          sender: { type: Schema.Types.ObjectId, required: true },
          createdAt: { type: Date, required: true },
        },
        { _id: false },
      ),
    },
  },
  { timestamps: true },
);

export const Conversation = model<ConversationRecord>("Conversation", conversationSchema);
