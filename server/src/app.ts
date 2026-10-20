import cors from "cors";
import express from "express";
import helmet from "helmet";
import mongoose from "mongoose";
import { pinoHttp } from "pino-http";
import { getEnv } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.js";
import { apiLimiter } from "./middleware/rate-limit.js";
import { createAuthRouter } from "./modules/auth/auth.routes.js";
import { conversationsRouter } from "./modules/conversations/conversations.routes.js";
import { messagesRouter } from "./modules/messages/messages.routes.js";
import { usersRouter } from "./modules/users/users.routes.js";

export function createApp(options: { rateLimit?: boolean } = {}) {
  const env = getEnv();
  const rateLimit = options.rateLimit ?? true;
  const app = express();

  app.set("trust proxy", env.trustProxy);
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors({ origin: env.corsOrigins }));
  app.use(express.json({ limit: "16kb" }));
  app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === "/health" } }));

  app.get("/health", async (_req, res) => {
    try {
      await mongoose.connection.db?.admin().ping();
      if (mongoose.connection.readyState !== 1) throw new Error("not connected");
      res.json({ status: "ok" });
    } catch {
      res.status(503).json({ status: "degraded" });
    }
  });

  const api = express.Router();
  if (rateLimit) api.use(apiLimiter());
  api.use("/auth", createAuthRouter({ rateLimit }));
  api.use("/users", usersRouter);
  api.use(messagesRouter);
  api.use("/conversations", conversationsRouter);
  app.use("/api", api);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
