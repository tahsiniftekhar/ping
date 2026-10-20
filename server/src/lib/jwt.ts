import jwt from "jsonwebtoken";
import { getEnv } from "../config/env.js";

export function signToken(userId: string): string {
  const { JWT_SECRET, JWT_EXPIRES_IN } = getEnv();
  return jwt.sign({}, JWT_SECRET, {
    subject: userId,
    expiresIn: JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
    algorithm: "HS256",
  });
}

/** Returns the user id from a valid token, or null if it is invalid or expired. */
export function verifyToken(token: string): string | null {
  try {
    const payload = jwt.verify(token, getEnv().JWT_SECRET, { algorithms: ["HS256"] });
    return typeof payload === "object" && typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}
