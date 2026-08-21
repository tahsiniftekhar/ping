import { apiClient } from "@/lib/api/client";
import type { LoginResponse, User } from "@/types/api";

export function loginWithApi(phone: string, name: string) {
  return apiClient.post<LoginResponse>("/auth/login", { phone, name });
}

export function fetchCurrentUser() {
  return apiClient.get<User>("/auth/me");
}
