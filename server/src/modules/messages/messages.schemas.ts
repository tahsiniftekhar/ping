import { z } from "zod";
import { objectId } from "../../lib/object-id.js";

const text = z.string().trim().min(1, "is required").max(4000);

export const sendMessageBody = z.object({ conversationId: objectId, text });

export const historyQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(30),
  before: objectId.optional(),
});
