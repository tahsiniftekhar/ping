/**
 * Escapes regex metacharacters (\ ^ $ . * + ? ( ) [ ] { } |) in search queries
 * so that backend regex operations treat them as literal characters instead of syntax tokens.
 */
export function escapeRegex(input: string): string {
  return input.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
}
