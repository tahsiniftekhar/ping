import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { z } from "zod";
import { getEnv } from "../config/env.js";
import { AppError } from "../lib/errors.js";
import { verifyToken } from "../lib/jwt.js";
import { logger } from "../lib/logger.js";
import { sendMessageBody } from "../modules/messages/messages.schemas.js";
import { sendMessage } from "../modules/messages/messages.service.js";
import { User } from "../modules/users/user.model.js";
import { setIo, userRoom } from "./emitter.js";

type Ack = (response: { ok: true } | { ok: false; error: string }) => void;

const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 10_000;

function validationMessage(error: z.ZodError) {
  const issue = error.issues[0];
  return issue ? `${issue.path.join(".")} ${issue.message}`.trim() : "Invalid message";
}

export function createSocketServer(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: { origin: getEnv().corsOrigins },
    // Same ceiling as the REST JSON body limit.
    maxHttpBufferSize: 16 * 1024,
  });
  setIo(io);

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      const userId = typeof token === "string" ? verifyToken(token) : null;
      if (!userId || !(await User.exists({ _id: userId }))) return next(new Error("Invalid token"));
      socket.data.userId = userId;
      next();
    } catch (error) {
      logger.error({ err: error }, "socket auth failed");
      next(new Error("Authentication unavailable"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId as string;
    void socket.join(userRoom(userId));

    const sentAt: number[] = [];

    socket.on("message:send", async (payload: unknown, ack?: Ack) => {
      const reply = typeof ack === "function" ? ack : () => {};
      try {
        const now = Date.now();
        while (sentAt.length > 0 && now - sentAt[0]! > RATE_LIMIT_WINDOW_MS) sentAt.shift();
        if (sentAt.length >= RATE_LIMIT_MAX) return reply({ ok: false, error: "Slow down" });
        sentAt.push(now);

        const parsed = sendMessageBody.safeParse(payload);
        if (!parsed.success) return reply({ ok: false, error: validationMessage(parsed.error) });

        await sendMessage(userId, parsed.data.conversationId, parsed.data.text);
        reply({ ok: true });
      } catch (error) {
        if (error instanceof AppError) return reply({ ok: false, error: error.message });
        logger.error({ err: error, userId }, "message:send failed");
        reply({ ok: false, error: "Failed to send message" });
      }
    });
  });

  return io;
}
