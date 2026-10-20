"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme, type ThemePreference } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";

const OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light theme", icon: Sun },
  { value: "system", label: "System theme", icon: Monitor },
  { value: "dark", label: "Dark theme", icon: Moon },
];

export function ThemeToggle({ className }: { className?: string }) {
  const { preference, setPreference } = useTheme();

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full border border-foreground/[0.08] bg-foreground/[0.03] p-0.5",
        className,
      )}
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = preference === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            onClick={() => setPreference(value)}
            className={cn(
              "flex size-6 items-center justify-center rounded-full text-subtle transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand/50",
              active ? "bg-surface text-foreground shadow-sm" : "hover:text-foreground",
            )}
          >
            <Icon className="size-3.5" />
          </button>
        );
      })}
    </div>
  );
}
