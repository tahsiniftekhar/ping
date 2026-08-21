import { io, type Socket } from "socket.io-client";
import { env } from "@/lib/env";
import { getToken } from "@/features/auth/token-storage";

/**
 * Creates the chat Socket.io client. Connects to the API host root (not /api)
 * with the JWT in the handshake, reusing the existing token storage — there is
 * deliberately no second token mechanism or connection manager here.
 */
export function createChatSocket(): Socket {
  const token = getToken();
  if (!token) throw new Error("Cannot create chat socket without an auth token");
  return io(env.socketUrl, { auth: { token } });
}
