import { useQuery } from "@tanstack/react-query";
import { searchUsers } from "@/features/users/api";

export const userKeys = {
  search: (query: string) => ["users", "search", query] as const,
};

/**
 * Searches users by name or phone. Only runs for non-empty trimmed queries —
 * callers pass the debounced raw input; the guard lives here so no call site
 * can accidentally request an empty search.
 */
export function useUserSearch(rawQuery: string) {
  const query = rawQuery.trim();
  return useQuery({
    queryKey: userKeys.search(query),
    queryFn: () => searchUsers(query),
    enabled: query.length > 0,
    // Results are cheap to refetch and change as people register.
    staleTime: 0,
  });
}
