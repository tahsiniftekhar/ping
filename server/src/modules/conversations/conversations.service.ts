import type { UpdateQuery } from "mongoose";
import { badRequest, forbidden, notFound, unknownUser } from "../../lib/errors.js";
import { emitConversationUpdated } from "../../realtime/emitter.js";
import { Message } from "../messages/message.model.js";
import { allUsersExist, getUser, loadUsers } from "../users/users.service.js";
import { Conversation, type ConversationRecord } from "./conversation.model.js";
import { serializeGroup, serializeGroupEvent, serializeListItem } from "./conversations.serializer.js";

const hasId = (list: { toString(): string }[], id: string) => list.some((item) => item.toString() === id);
const unique = (list: string[]) => [...new Set(list)];

export async function listConversations(userId: string) {
  const conversations = await Conversation.find({ participants: userId }).sort({ updatedAt: -1 }).lean();
  const users = await loadUsers(conversations.flatMap((conversation) => conversation.participants));
  return { data: conversations.map((conversation) => serializeListItem(conversation, users, userId)) };
}

export async function startDirectConversation(userId: string, otherId: string) {
  if (userId === otherId) throw badRequest("You cannot start a conversation with yourself");
  if (!(await getUser(otherId))) throw notFound("User not found");

  const directKey = [userId, otherId].sort().join(":");
  const existing = () => Conversation.findOne({ directKey }).lean();

  let conversation = await existing();
  if (!conversation) {
    try {
      const created = await Conversation.create({ type: "direct", participants: [userId, otherId], directKey });
      conversation = created.toObject();
    } catch (error) {
      // A concurrent request created the same pair first.
      if (!isDuplicateKeyError(error)) throw error;
      conversation = await existing();
    }
  }
  if (!conversation) throw notFound("Conversation not found");

  return {
    _id: conversation._id.toString(),
    participants: conversation.participants.map((id) => id.toString()),
    createdAt: conversation.createdAt.toISOString(),
  };
}

async function publishGroup(conversation: ConversationRecord, alsoNotify: string[] = []) {
  const users = await loadUsers(conversation.participants);
  const recipients = unique([...conversation.participants.map((id) => id.toString()), ...alsoNotify]);
  emitConversationUpdated(recipients, serializeGroupEvent(conversation, users));
  return serializeGroup(conversation, users);
}

async function requireGroup(userId: string, conversationId: string) {
  const conversation = await Conversation.findOne({ _id: conversationId, participants: userId }).lean();
  if (!conversation) throw notFound("Conversation not found");
  if (conversation.type !== "group") throw badRequest("This action is only available for group conversations");
  return conversation;
}

async function updateGroup(conversationId: string, update: UpdateQuery<ConversationRecord>) {
  const conversation = await Conversation.findByIdAndUpdate(conversationId, update, { new: true, lean: true });
  if (!conversation) throw notFound("Conversation not found");
  return conversation;
}

export async function createGroup(creatorId: string, name: string, participantIds: string[]) {
  const memberIds = unique([creatorId, ...participantIds]);
  if (memberIds.length < 3) throw badRequest("a group needs at least 3 members");
  if (!(await allUsersExist(memberIds))) throw unknownUser();

  const created = await Conversation.create({
    type: "group",
    name,
    participants: memberIds,
    createdBy: creatorId,
    admins: [creatorId],
  });
  return publishGroup(created.toObject());
}

export async function renameGroup(userId: string, conversationId: string, name: string) {
  const group = await requireGroup(userId, conversationId);
  if (!hasId(group.admins, userId)) throw forbidden("Only admins can rename the group");
  return publishGroup(await updateGroup(conversationId, { $set: { name } }));
}

export async function addParticipants(userId: string, conversationId: string, userIds: string[]) {
  const group = await requireGroup(userId, conversationId);
  if (!hasId(group.admins, userId)) throw forbidden("Only admins can add participants");

  const ids = unique(userIds);
  if (!(await allUsersExist(ids))) throw unknownUser();

  return publishGroup(await updateGroup(conversationId, { $addToSet: { participants: { $each: ids } } }));
}

export async function removeParticipant(actorId: string, conversationId: string, targetId: string) {
  const group = await requireGroup(actorId, conversationId);
  if (targetId !== actorId && !hasId(group.admins, actorId)) {
    throw forbidden("Only admins can remove other members");
  }
  if (!hasId(group.participants, targetId)) throw notFound("Member not found");

  let updated = await updateGroup(conversationId, { $pull: { participants: targetId, admins: targetId } });

  if (updated.participants.length === 0) {
    await Promise.all([Conversation.deleteOne({ _id: conversationId }), Message.deleteMany({ conversation: conversationId })]);
  } else if (updated.admins.length === 0) {
    // Earliest remaining member inherits the group so it is never left without an admin.
    updated = await updateGroup(conversationId, { $addToSet: { admins: updated.participants[0] } });
  }

  return publishGroup(updated, [targetId]);
}

export async function promoteToAdmin(userId: string, conversationId: string, targetId: string) {
  const group = await requireGroup(userId, conversationId);
  if (!hasId(group.admins, userId)) throw forbidden("Only admins can promote members");
  if (!hasId(group.participants, targetId)) throw badRequest("User is not a member of this group");

  return publishGroup(await updateGroup(conversationId, { $addToSet: { admins: targetId } }));
}

// Checked by code: the driver is a transitive dependency of mongoose, not ours to import.
function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
}
