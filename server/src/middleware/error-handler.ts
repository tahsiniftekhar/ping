import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import { AppError } from "../lib/errors.js";
import { logger } from "../lib/logger.js";
import { formatIssues } from "../lib/validate.js";

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({ error: { message: "Route not found", code: "NOT_FOUND" } });
};

function isHttpError(error: unknown): error is { status: number; type?: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof error.status === "number" &&
    error.status >= 400 &&
    error.status < 500
  );
}

export const errorHandler: ErrorRequestHandler = (error, req, res, next) => {
  if (res.headersSent) return next(error);

  if (error instanceof AppError) {
    res.status(error.status).json({
      error: { message: error.message, code: error.code, ...(error.details !== undefined && { details: error.details }) },
    });
    return;
  }

  if (error instanceof ZodError) {
    res.status(400).json({ error: { message: "Invalid request", code: "VALIDATION_ERROR", details: formatIssues(error) } });
    return;
  }

  // Body-parser failures (malformed JSON, payload too large)
  if (isHttpError(error)) {
    const message = error.status === 413 ? "Request body too large" : "Malformed request body";
    res.status(error.status).json({ error: { message, code: "VALIDATION_ERROR" } });
    return;
  }

  (req.log ?? logger).error({ err: error }, "unhandled error");
  res.status(500).json({ error: { message: "Something went wrong", code: "SERVER_ERROR" } });
};
