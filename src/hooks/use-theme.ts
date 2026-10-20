"use client";

import { useCallback, useSyncExternalStore } from "react";
import { THEME_STORAGE_KEY as STORAGE_KEY } from "@/lib/theme";

export type ThemePreference = "light" | "dark" | "system";

const listeners = new Set<() => void>();

function readPreference(): ThemePreference {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // Storage can throw in private mode; fall back to the system theme.
  }
  return "system";
}

function systemPrefersDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyTheme(preference: ThemePreference) {
  const dark = preference === "dark" || (preference === "system" && systemPrefersDark());
  document.documentElement.classList.toggle("dark", dark);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const onSystemChange = () => {
    if (readPreference() === "system") applyTheme("system");
    listener();
  };
  media.addEventListener("change", onSystemChange);
  return () => {
    listeners.delete(listener);
    media.removeEventListener("change", onSystemChange);
  };
}

export function useTheme() {
  const preference = useSyncExternalStore(subscribe, readPreference, () => "system" as const);
  const resolved = useSyncExternalStore(
    subscribe,
    () => (document.documentElement.classList.contains("dark") ? "dark" : "light"),
    () => "light" as const,
  );

  const setPreference = useCallback((next: ThemePreference) => {
    try {
      if (next === "system") window.localStorage.removeItem(STORAGE_KEY);
      else window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Non-persistent fallback: still apply for this page view.
    }
    applyTheme(next);
    listeners.forEach((listener) => listener());
  }, []);

  return { preference, resolved, setPreference };
}
