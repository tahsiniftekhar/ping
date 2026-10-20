import { rateLimit } from "express-rate-limit";

function limiter(limit: number, windowMs: number) {
  return rateLimit({
    limit,
    windowMs,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({ error: { message: "Too many requests, please try again later", code: "RATE_LIMITED" } });
    },
  });
}

export const loginLimiter = () => limiter(10, 60_000);
export const apiLimiter = () => limiter(300, 60_000);
