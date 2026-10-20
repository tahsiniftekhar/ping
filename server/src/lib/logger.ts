import { pino } from "pino";

// Read directly (not via getEnv) so a bad config can still be reported through the logger.
export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  redact: ["req.headers.authorization", "req.headers.cookie"],
});
