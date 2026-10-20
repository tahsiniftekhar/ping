"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { fetchCurrentUser, loginWithApi } from "@/features/auth/api";
import { getToken, removeToken, setToken } from "@/features/auth/token-storage";
import { ApiError, setTokenGetter } from "@/lib/api/client";
import type { User } from "@/types/api";

interface AuthContextValue {
  user: User | null;
  /** True while a stored token is being validated against GET /auth/me. */
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (phone: string, name: string) => Promise<void>;
  logout: () => void;
}

const SESSION_RESTORE_RETRIES = 3;

const AuthContext = createContext<AuthContextValue | null>(null);

// The API client reads the token through this seam on every request.
setTokenGetter(getToken);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  // Only needs an async validation round-trip when a token exists; without one
  // we start (and stay) unauthenticated with no loading state.
  const [isLoading, setIsLoading] = useState(() => getToken() !== null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!getToken()) return;
    let cancelled = false;

    async function restoreSession() {
      for (let attempt = 0; ; attempt += 1) {
        try {
          const me = await fetchCurrentUser();
          if (!cancelled) setUser(me);
          return;
        } catch (cause) {
          // Network errors and 5xx are usually the free-tier host waking up;
          // only a 4xx means the token itself is bad and should be discarded.
          const transient = !(cause instanceof ApiError) || cause.status === 0 || cause.status >= 500;
          if (!transient) {
            removeToken();
            return;
          }
          if (attempt >= SESSION_RESTORE_RETRIES || cancelled) return;
          await new Promise((resolve) => setTimeout(resolve, 2_000 * 2 ** attempt));
        }
      }
    }

    void restoreSession().finally(() => {
      if (!cancelled) setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (phone: string, name: string) => {
    const { token, user: loggedInUser } = await loginWithApi(phone, name);
    setToken(token);
    setUser(loggedInUser);
  }, []);

  const logout = useCallback(() => {
    removeToken();
    setUser(null);
    // Server data belongs to the previous session; drop all of it.
    queryClient.clear();
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: user !== null,
      login,
      logout,
    }),
    [user, isLoading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
