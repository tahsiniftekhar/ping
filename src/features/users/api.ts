import { apiClient } from "@/lib/api/client";
import type { User } from "@/types/api";

export function searchUsers(query: string) {
  return apiClient.get<User[]>("/users/search", { searchParams: { q: query } });
}
