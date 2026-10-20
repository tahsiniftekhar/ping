import { Types } from "mongoose";
import { User, type UserRecord } from "./user.model.js";

export const PHONE_PATTERN = /^\+?\d{7,15}$/;

export function normalizePhone(input: string): string {
  return input.replace(/[\s\-()]/g, "");
}

export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function serializePublicUser(user: Pick<UserRecord, "_id" | "name" | "phone">) {
  return { _id: user._id.toString(), name: user.name, phone: user.phone };
}

export function serializeUser(user: UserRecord) {
  return { ...serializePublicUser(user), createdAt: user.createdAt.toISOString() };
}

export async function findOrCreateUser(phone: string, name: string) {
  // setOnInsert keeps the stored name for returning users; upsert is atomic per phone.
  const user = await User.findOneAndUpdate(
    { phone },
    { $setOnInsert: { name } },
    { upsert: true, new: true, lean: true },
  );
  if (!user) throw new Error("login upsert returned no user");
  return user;
}

export async function getUser(id: string) {
  return User.findById(id).lean();
}

export async function loadUsers(ids: Types.ObjectId[]) {
  const users = await User.find({ _id: { $in: ids } }, "name phone").lean();
  return new Map(users.map((user) => [user._id.toString(), user]));
}

export async function allUsersExist(ids: string[]) {
  if (ids.length === 0) return true;
  return (await User.countDocuments({ _id: { $in: ids } })) === ids.length;
}

export async function searchUsers(requesterId: string, query: string) {
  const phoneQuery = normalizePhone(query);
  const conditions: Record<string, unknown>[] = [{ name: { $regex: escapeRegex(query), $options: "i" } }];
  if (/^\+?\d+$/.test(phoneQuery)) {
    conditions.push({ phone: { $regex: escapeRegex(phoneQuery) } });
  }

  const users = await User.find(
    { _id: { $ne: requesterId }, $or: conditions },
    "name phone",
  )
    .collation({ locale: "en" })
    .sort({ name: 1, _id: 1 })
    .limit(20)
    .lean();
  return users.map(serializePublicUser);
}
