import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { loginLimiter } from "../../middleware/rate-limit.js";
import { unauthorized } from "../../lib/errors.js";
import { parse } from "../../lib/validate.js";
import { getUser, serializeUser } from "../users/users.service.js";
import { loginBody } from "./auth.schemas.js";
import { login } from "./auth.service.js";

export function createAuthRouter(options: { rateLimit: boolean }) {
  const router = Router();

  if (options.rateLimit) router.post("/login", loginLimiter());

  router.post("/login", async (req, res) => {
    const { phone, name } = parse(loginBody, req.body ?? {});
    res.json(await login(phone, name));
  });

  router.get("/me", requireAuth, async (req, res) => {
    const user = await getUser(req.userId);
    if (!user) throw unauthorized("INVALID_TOKEN", "Invalid or expired token");
    res.json(serializeUser(user));
  });

  return router;
}
