/**
 * localStorage-backed JWT storage. The API uses bearer tokens (no cookies),
 * so the client persists the token itself.
 *
 * All access must go through these functions; they are SSR-safe (no-ops on the
 * server) because localStorage does not exist during server rendering.
 */

const TOKEN_KEY = "chatapp.token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
}
