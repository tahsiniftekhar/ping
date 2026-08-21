/**
 * Thin fetch wrapper for the chat REST API.
 *
 * All requests are made from the browser directly against the external API
 * (CORS is supported; see docs/DECISIONS.md). The JWT is attached from
 * the token store. Feature modules should call the exported `apiClient`
 * methods rather than using fetch directly.
 */
import { env } from "@/lib/env";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string | undefined,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Raw error envelope returned by the API: `{ error: { message, code, details? } }`. */
interface ApiErrorBody {
  error?: {
    message?: string;
    code?: string;
    details?: unknown;
  };
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
  searchParams?: Record<string, string>;
}

/** Provider that supplies the current JWT. Wired to the token store by the auth feature. */
let tokenGetter: () => string | null = () => null;

export function setTokenGetter(getter: () => string | null) {
  tokenGetter = getter;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, signal, searchParams } = options;

  const url = new URL(`${env.apiBaseUrl}${path}`);
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      url.searchParams.set(key, value);
    }
  }

  const headers: Record<string, string> = {};
  const token = tokenGetter();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === "AbortError") throw cause;
    throw new ApiError(0, "NETWORK_ERROR", "Could not reach the server. Please try again.", {
      cause,
    });
  }

  // The API can return 200 with an empty/null body (e.g. POST /messages).
  const text = await response.text();
  const parsed: unknown = text ? (JSON.parse(text) as unknown) : null;

  if (!response.ok) {
    const errorBody = (parsed as ApiErrorBody | null)?.error;
    throw new ApiError(
      response.status,
      errorBody?.code,
      errorBody?.message ?? `Request failed with status ${response.status}`,
      errorBody?.details,
    );
  }

  return parsed as T;
}

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "POST", body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "PATCH", body }),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "DELETE" }),
};
