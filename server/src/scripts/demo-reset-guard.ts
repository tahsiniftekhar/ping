/**
 * Guard for reset-demo: the reset drops collections, so it refuses to run unless it is
 * explicitly allowed and MONGODB_URI names the demo database, so a wrong URI never wipes
 * another database.
 */
export const ALLOWED_DATABASES = ["ping"];

/** Database name from a mongodb:// or mongodb+srv:// URI ("" when it names none). */
export function mongoDatabaseName(uri: string): string {
  const match = /^mongodb(?:\+srv)?:\/\/[^/?]*\/([^?]*)/.exec(uri);
  if (!match) return "";
  try {
    return decodeURIComponent(match[1]!);
  } catch {
    return "";
  }
}

/** Why the reset must not run, or null when it may. */
export function demoResetRefusal(env: NodeJS.ProcessEnv): string | null {
  if (env.DEMO_RESET_ALLOWED !== "true") return 'DEMO_RESET_ALLOWED is not "true".';
  const name = mongoDatabaseName(env.MONGODB_URI ?? "");
  if (!ALLOWED_DATABASES.includes(name)) {
    return `MONGODB_URI targets database "${name}", allowed: ${ALLOWED_DATABASES.join(", ")}.`;
  }
  return null;
}
