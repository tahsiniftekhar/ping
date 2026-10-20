import { z } from "zod";
import { badRequest } from "./errors.js";

export function formatIssues(error: z.ZodError) {
  return error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message }));
}

export function parse<T extends z.ZodType>(schema: T, data: unknown): z.output<T> {
  const result = schema.safeParse(data);
  if (!result.success) throw badRequest("Invalid request", formatIssues(result.error));
  return result.data;
}
