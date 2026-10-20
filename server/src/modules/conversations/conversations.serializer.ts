import type { Types } from "mongoose";
import type { UserRecord } from "../users/user.model.js";
import { serializePublicUser } from "../users/users.service.js";
import type { ConversationRecord } from "./conversation.model.js";

export type UserMap = Map<string, Pick<UserRecord, "_id" | "name" | "phone">>;

const ids = (list: Types.ObjectId[]) => list.map((id) => id.toString());

function serializeLastMessage(conversation: ConversationRecord) {
  const last = conversation.lastMessage;
  if (!last) return {};
  return { text: last.text, sender: last.sender.toString(), createdAt: last.createdAt.toISOString() };
}

function serializeMembers(conversation: ConversationRecord, users: UserMap) {
  return conversation.participants.flatMap((id) => {
    const user = users.get(id.toString());
    return user ? [serializePublicUser(user)] : [];
  });
}

/** Group payload as pushed over the socket: no lastMessage, no timestamps. */
export function serializeGroupEvent(conversation: ConversationRecord, users: UserMap) {
  return {
    _id: conversation._id.toString(),
    type: "group" as const,
    name: conversation.name ?? "",
    createdBy: conversation.createdBy?.toString() ?? "",
    admins: ids(conversation.admins),
    participants: serializeMembers(conversation, users),
  };
}

export function serializeGroup(conversation: ConversationRecord, users: UserMap) {
  return {
    ...serializeGroupEvent(conversation, users),
    lastMessage: serializeLastMessage(conversation),
    createdAt: conversation.createdAt.toISOString(),
    updatedAt: conversation.updatedAt.toISOString(),
  };
}

export function serializeListItem(conversation: ConversationRecord, users: UserMap, viewerId: string) {
  if (conversation.type === "group") {
    const { createdAt: _createdAt, ...item } = serializeGroup(conversation, users);
    return item;
  }

  const otherId = conversation.participants.find((id) => id.toString() !== viewerId);
  const other = otherId && users.get(otherId.toString());
  return {
    _id: conversation._id.toString(),
    type: "direct" as const,
    lastMessage: serializeLastMessage(conversation),
    updatedAt: conversation.updatedAt.toISOString(),
    // A direct chat always has a counterpart; fall back to the id if the user record is gone.
    participant: other ? serializePublicUser(other) : { _id: otherId?.toString() ?? "", name: "Unknown user", phone: "" },
  };
}
