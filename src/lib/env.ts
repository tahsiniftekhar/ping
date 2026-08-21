/**
 * Central access point for environment configuration.
 * Never read process.env directly elsewhere in the app.
 */
export const env = {
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
  socketUrl: process.env.NEXT_PUBLIC_SOCKET_URL,
} as const;

if (!env.apiBaseUrl || !env.socketUrl) {
  // Fail loudly at module load rather than producing broken requests later.
  throw new Error(
    "Missing NEXT_PUBLIC_API_BASE_URL or NEXT_PUBLIC_SOCKET_URL. Copy .env.example to .env.local.",
  );
}
