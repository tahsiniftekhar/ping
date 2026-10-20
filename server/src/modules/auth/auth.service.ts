import { signToken } from "../../lib/jwt.js";
import { findOrCreateUser, serializeUser } from "../users/users.service.js";

export async function login(phone: string, name: string) {
  const user = await findOrCreateUser(phone, name);
  return { token: signToken(user._id.toString()), user: serializeUser(user) };
}
