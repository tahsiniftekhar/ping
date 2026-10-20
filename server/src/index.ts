import { createServer } from "node:http";
import mongoose from "mongoose";
import { createApp } from "./app.js";
import { getEnv } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { createSocketServer } from "./realtime/socket.js";

const SHUTDOWN_TIMEOUT_MS = 10_000;

async function main() {
  const env = getEnv();

  mongoose.set("strictQuery", true);
  mongoose.connection.on("connected", () => logger.info("mongo connected"));
  mongoose.connection.on("disconnected", () => logger.warn("mongo disconnected"));
  mongoose.connection.on("error", (err) => logger.error({ err }, "mongo error"));
  await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 10_000 });

  const httpServer = createServer(createApp());
  const io = createSocketServer(httpServer);

  await new Promise<void>((resolve) => httpServer.listen(env.PORT, resolve));
  logger.info({ port: env.PORT, env: env.NODE_ENV }, "server listening");

  let shuttingDown = false;
  const shutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, "shutting down");
    setTimeout(() => {
      logger.error("shutdown timed out");
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS).unref();

    // io.close() also closes the underlying http server and stops accepting connections.
    io.close(() => {
      mongoose
        .disconnect()
        .then(() => process.exit(0))
        .catch((err) => {
          logger.error({ err }, "error during shutdown");
          process.exit(1);
        });
    });
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

process.on("unhandledRejection", (reason) => logger.error({ err: reason }, "unhandled rejection"));
process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "uncaught exception");
  process.exit(1);
});

main().catch((err) => {
  logger.fatal({ err }, "failed to start");
  process.exit(1);
});
