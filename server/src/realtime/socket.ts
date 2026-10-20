import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { z } from "zod";
import { getEnv } from "../config/env.js";
import { AppError } from "../lib/errors.js";
import { verifyToken } from "../lib/jwt.js";
import { logger } from "../lib/logger.js";
import { sendMessageBody, syncBody } from "../modules/messages/messages.schemas.js";
import { sendMessage, syncMessages } from "../modules/messages/messages.service.js";
import { User } from "../modules/users/user.model.js";
import { setIo, userRoom } from "./emitter.js";

type SyncAck = Ack<{ results: Awaited<ReturnType<typeof syncMessages>> }>;
type SendAck = Ack<{ message: Awaited<ReturnType<typeof sendMessage>> }>;
type Failure = { ok: false; error: string };
type Ack<T = object> = (response: ({ ok: true } & T) | Failure) => void;

const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 10_000;
const SYNC_RATE_LIMIT_MAX = 10;

/** Sliding-window counter; returns true when the call is allowed. */
function allow(hits: number[], max: number) {
  const now = Date.now();
  while (hits.length > 0 && now - hits[0]! > RATE_LIMIT_WINDOW_MS) hits.shift();
  if (hits.length >= max) return false;
  hits.push(now);
  return true;
}

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

    socket.emit("server:hello", { protocol: 2, features: ["idempotent-send", "message-seq", "sync"] });

    const sentAt: number[] = [];
    const syncedAt: number[] = [];

    socket.on("message:send", async (payload: unknown, ack?: SendAck) => {
      const reply = typeof ack === "function" ? ack : () => {};
      try {
        if (!allow(sentAt, RATE_LIMIT_MAX)) return reply({ ok: false, error: "Slow down" });

        const parsed = sendMessageBody.safeParse(payload);
        if (!parsed.success) return reply({ ok: false, error: validationMessage(parsed.error) });

        const { conversationId, text, clientMessageId } = parsed.data;
        reply({ ok: true, message: await sendMessage(userId, conversationId, text, clientMessageId) });
      } catch (error) {
        if (error instanceof AppError) return reply({ ok: false, error: error.message });
        logger.error({ err: error, userId }, "message:send failed");
        reply({ ok: false, error: "Failed to send message" });
      }
    });

    socket.on("messages:sync", async (payload: unknown, ack?: SyncAck) => {
      const reply = typeof ack === "function" ? ack : () => {};
      try {
        if (!allow(syncedAt, SYNC_RATE_LIMIT_MAX)) return reply({ ok: false, error: "Slow down" });

        const parsed = syncBody.safeParse(payload);
        if (!parsed.success) return reply({ ok: false, error: validationMessage(parsed.error) });

        reply({ ok: true, results: await syncMessages(userId, parsed.data.cursors) });
      } catch (error) {
        logger.error({ err: error, userId }, "messages:sync failed");
        reply({ ok: false, error: "Failed to sync messages" });
      }
    });
  });

  return io;
}
