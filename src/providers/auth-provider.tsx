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
import { setTokenGetter } from "@/lib/api/client";
import type { User } from "@/types/api";

interface AuthContextValue {
  user: User | null;
  /** True while a stored token is being validated against GET /auth/me. */
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (phone: string, name: string) => Promise<void>;
  logout: () => void;
}

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
    fetchCurrentUser()
      .then((me) => {
        if (!cancelled) setUser(me);
      })
      .catch(() => {
        // Invalid/expired token or unreachable server: treat as logged out
        // rather than blocking the app. The user can log in again.
        if (!cancelled) {
          removeToken();
          setUser(null);
        }
      })
      .finally(() => {
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
