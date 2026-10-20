import { Schema, model, type Types } from "mongoose";

export interface UserRecord {
  _id: Types.ObjectId;
  name: string;
  phone: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<UserRecord>(
  {
    name: { type: String, required: true, trim: true, minlength: 1, maxlength: 50 },
    phone: { type: String, required: true, unique: true },
  },
  { timestamps: true },
);

export const User = model<UserRecord>("User", userSchema);
