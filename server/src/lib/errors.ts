export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const badRequest = (message: string, details?: unknown) =>
  new AppError(400, "VALIDATION_ERROR", message, details);
export const unauthorized = (code: "NO_TOKEN" | "INVALID_TOKEN", message: string) =>
  new AppError(401, code, message);
export const forbidden = (message: string) => new AppError(403, "FORBIDDEN", message);
export const notFound = (message: string) => new AppError(404, "NOT_FOUND", message);
export const unknownUser = () => new AppError(400, "UNKNOWN_USER", "One or more users do not exist");
