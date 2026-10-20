import { z } from "zod";
import { objectId } from "../../lib/object-id.js";

const groupName = z.string().trim().min(1, "is required").max(50);

export const idParam = z.object({ id: objectId });
export const memberParams = z.object({ id: objectId, userId: objectId });

export const startDirectBody = z.object({ userId: objectId });
export const createGroupBody = z.object({
  name: groupName,
  participantIds: z.array(objectId).max(200),
});
export const renameBody = z.object({ name: groupName });
export const addParticipantsBody = z.object({ userIds: z.array(objectId).min(1).max(200) });
export const promoteBody = z.object({ userId: objectId });
