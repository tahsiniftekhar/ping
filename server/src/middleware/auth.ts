import type { RequestHandler } from "express";
import { unauthorized } from "../lib/errors.js";
import { verifyToken } from "../lib/jwt.js";
import { User } from "../modules/users/user.model.js";

declare module "express-serve-static-core" {
  interface Request {
    userId: string;
  }
}

export const requireAuth: RequestHandler = async (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header) throw unauthorized("NO_TOKEN", "Authentication token is required");

  const [scheme, token] = header.split(" ");
  const userId = scheme?.toLowerCase() === "bearer" && token ? verifyToken(token) : null;
  if (!userId) throw unauthorized("INVALID_TOKEN", "Invalid or expired token");

  if (!(await User.exists({ _id: userId }))) throw unauthorized("INVALID_TOKEN", "Invalid or expired token");

  req.userId = userId;
  next();
};
