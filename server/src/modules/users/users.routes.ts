import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.js";
import { parse } from "../../lib/validate.js";
import { searchUsers } from "./users.service.js";

// The web client regex-escapes the query before sending it; undo that so the
// server can apply its own escaping exactly once.
const unescapeClientRegex = (value: string) => value.replace(/\\([\\^$.*+?()[\]{}|])/g, "$1");

const searchQuery = z.object({
  q: z.string().transform(unescapeClientRegex).pipe(z.string().trim().min(1).max(50)),
});

export const usersRouter = Router();
usersRouter.use(requireAuth);

usersRouter.get("/search", async (req, res) => {
  const { q } = parse(searchQuery, req.query);
  res.json(await searchUsers(req.userId, q));
});
