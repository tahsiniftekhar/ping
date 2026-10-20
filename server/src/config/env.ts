import { z } from "zod";

const schema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    MONGODB_URI: z.string().min(1),
    JWT_SECRET: z.string().min(32, "must be at least 32 characters"),
    JWT_EXPIRES_IN: z.string().min(1).default("7d"),
    CORS_ORIGINS: z.string().default(""),
    TRUST_PROXY: z.coerce.number().int().min(0).optional(),
    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  })
  .superRefine((value, ctx) => {
    if (value.NODE_ENV === "production" && parseOrigins(value.CORS_ORIGINS).length === 0) {
      ctx.addIssue({ code: "custom", path: ["CORS_ORIGINS"], message: "is required in production" });
    }
  });

function parseOrigins(raw: string): string[] {
  return raw
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean);
}

function load(source: NodeJS.ProcessEnv) {
  const result = schema.safeParse(source);
  if (!result.success) {
    const problems = result.error.issues.map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`);
    throw new Error(`Invalid environment configuration:\n${problems.join("\n")}`);
  }
  const value = result.data;
  const isProduction = value.NODE_ENV === "production";
  const corsOrigins = parseOrigins(value.CORS_ORIGINS);
  if (value.NODE_ENV === "development" && corsOrigins.length === 0) {
    corsOrigins.push("http://localhost:3000");
  }
  return {
    ...value,
    isProduction,
    corsOrigins,
    trustProxy: value.TRUST_PROXY ?? (isProduction ? 1 : 0),
  };
}

export type Env = ReturnType<typeof load>;

let cached: Env | undefined;

/** Parsed lazily so a bad configuration fails at first use (boot) with a readable message. */
export function getEnv(): Env {
  cached ??= load(process.env);
  return cached;
}
