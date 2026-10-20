import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { parse } from "../../lib/validate.js";
import {
  addParticipantsBody,
  createGroupBody,
  idParam,
  memberParams,
  promoteBody,
  renameBody,
  startDirectBody,
} from "./conversations.schemas.js";
import {
  addParticipants,
  createGroup,
  listConversations,
  promoteToAdmin,
  removeParticipant,
  renameGroup,
  startDirectConversation,
} from "./conversations.service.js";

export const conversationsRouter = Router();
conversationsRouter.use(requireAuth);

conversationsRouter.get("/", async (req, res) => {
  res.json(await listConversations(req.userId));
});

conversationsRouter.post("/", async (req, res) => {
  const { userId } = parse(startDirectBody, req.body ?? {});
  res.json(await startDirectConversation(req.userId, userId));
});

conversationsRouter.post("/group", async (req, res) => {
  const { name, participantIds } = parse(createGroupBody, req.body ?? {});
  res.status(201).json(await createGroup(req.userId, name, participantIds));
});

conversationsRouter.patch("/:id", async (req, res) => {
  const { id } = parse(idParam, req.params);
  const { name } = parse(renameBody, req.body ?? {});
  res.json(await renameGroup(req.userId, id, name));
});

conversationsRouter.post("/:id/participants", async (req, res) => {
  const { id } = parse(idParam, req.params);
  const { userIds } = parse(addParticipantsBody, req.body ?? {});
  res.json(await addParticipants(req.userId, id, userIds));
});

conversationsRouter.delete("/:id/participants/:userId", async (req, res) => {
  const { id, userId } = parse(memberParams, req.params);
  res.json(await removeParticipant(req.userId, id, userId));
});

conversationsRouter.post("/:id/admins", async (req, res) => {
  const { id } = parse(idParam, req.params);
  const { userId } = parse(promoteBody, req.body ?? {});
  res.json(await promoteToAdmin(req.userId, id, userId));
});
