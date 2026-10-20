import { z } from "zod";
import { objectId } from "../../lib/object-id.js";

const text = z.string().trim().min(1, "is required").max(4000);

export const clientMessageId = z
  .string()
  .min(8)
  .max(64)
  .regex(/^[A-Za-z0-9_-]+$/, "may only contain letters, digits, - and _");

export const sendMessageBody = z.object({ conversationId: objectId, text, clientMessageId: clientMessageId.optional() });

export const syncBody = z.object({
  cursors: z
    .array(z.object({ conversationId: objectId, afterSeq: z.number().int().min(0) }))
    .max(100),
});

export const historyQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(30),
  before: objectId.optional(),
});
