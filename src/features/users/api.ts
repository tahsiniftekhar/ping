import { apiClient } from "@/lib/api/client";
import type { User } from "@/types/api";
import { escapeRegex } from "@/features/users/helpers";

export function searchUsers(query: string) {
  const sanitized = escapeRegex(query);
  return apiClient.get<User[]>("/users/search", { searchParams: { q: sanitized } });
}
