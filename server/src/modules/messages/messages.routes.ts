import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.js";
import { objectId } from "../../lib/object-id.js";
import { parse } from "../../lib/validate.js";
import { historyQuery, sendMessageBody } from "./messages.schemas.js";
import { getHistory, sendMessage } from "./messages.service.js";

export const messagesRouter = Router();

messagesRouter.get("/conversations/:id/messages", requireAuth, async (req, res) => {
  const { id } = parse(z.object({ id: objectId }), req.params);
  const { limit, before } = parse(historyQuery, req.query);
  res.json(await getHistory(req.userId, id, limit, before));
});

messagesRouter.post("/messages", requireAuth, async (req, res) => {
  const { conversationId, text, clientMessageId } = parse(sendMessageBody, req.body ?? {});
  res.json(await sendMessage(req.userId, conversationId, text, clientMessageId));
});
