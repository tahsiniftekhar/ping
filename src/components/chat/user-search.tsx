"use client";

import { useId, useMemo, useState } from "react";
import { Check, Loader2, Search, X } from "lucide-react";
import { useUserSearch } from "@/features/users/queries";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/providers/auth-provider";
import { cn } from "@/lib/utils";
import type { User } from "@/types/api";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export const dialogContentClass =
  "flex max-h-[88vh] w-full max-w-[calc(100%-1rem)] flex-col gap-4 overflow-hidden rounded-[24px] border border-foreground/[0.08] bg-card p-5 shadow-[0_16px_48px_rgba(23,23,23,0.08)] sm:max-w-md sm:p-6";

export const fieldClass =
  "h-10 w-full rounded-xl border border-foreground/10 bg-surface px-3.5 text-sm text-foreground outline-none transition-colors placeholder:text-subtle focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/40 disabled:opacity-50";

export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

interface UserSearchProps {
  query: string;
  onQueryChange: (query: string) => void;
  onSelect: (user: User) => void;
  /** Rows shown with a check. */
  selectedIds?: ReadonlySet<string>;
  /** Users hidden from results (e.g. existing group members). */
  excludeIds?: ReadonlySet<string>;
  /** Row showing an "Opening…" spinner. */
  pendingId?: string | null;
  disabled?: boolean;
  autoFocus?: boolean;
  placeholder?: string;
  label?: string;
  idleHint?: string;
  /** Tailwind max-height class for the results scroller. */
  listClassName?: string;
}

export function UserSearch({
  query,
  onQueryChange,
  onSelect,
  selectedIds,
  excludeIds,
  pendingId = null,
  disabled = false,
  autoFocus = false,
  placeholder = "Search by name",
  label = "Search users by name",
  idleHint = "Type a name to find people.",
  listClassName = "max-h-60",
}: UserSearchProps) {
  const { user: me } = useAuth();
  const listId = useId();
  const [activeIndex, setActiveIndex] = useState(0);

  const debounced = useDebouncedValue(query, 300);
  const trimmed = debounced.trim();
  const search = useUserSearch(debounced);

  const results = useMemo(
    () =>
      (search.data ?? []).filter(
        (user) => user._id !== me?._id && !excludeIds?.has(user._id),
      ),
    [search.data, me?._id, excludeIds],
  );

  const idle = trimmed.length === 0;
  const loading = !idle && search.isFetching && !search.data;
  const failed = !idle && search.isError;
  const empty = !idle && !loading && !failed && results.length === 0;
  const showList = !idle && !failed && results.length > 0;
  const optionId = (index: number) => `${listId}-opt-${index}`;
  const activeOption = showList ? optionId(Math.min(activeIndex, results.length - 1)) : undefined;

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!showList) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + results.length) % results.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const user = results[Math.min(activeIndex, results.length - 1)];
      if (user && !disabled) onSelect(user);
    }
  }

  return (
    <div className="flex min-h-0 flex-col gap-2">
      <div className="relative">
        <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-subtle" />
        <input
          type="text"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-activedescendant={activeOption}
          aria-autocomplete="list"
          aria-label={label}
          value={query}
          onChange={(event) => {
            setActiveIndex(0);
            onQueryChange(event.target.value);
          }}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          autoFocus={autoFocus}
          disabled={disabled}
          className={cn(fieldClass, "pr-9 pl-10")}
        />
        {query.length > 0 && (
          <button
            type="button"
            aria-label="Clear search"
            disabled={disabled}
            onClick={() => onQueryChange("")}
            className="absolute top-1/2 right-2 flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-subtle transition-colors outline-none hover:bg-foreground/[0.06] hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand/40"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      <div className="flex min-h-32 flex-col" aria-live="polite">
        {idle && <p className="px-1 py-8 text-center text-xs text-subtle">{idleHint}</p>}

        {loading && (
          <div className="flex flex-col gap-2 py-1" aria-label="Searching">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-11 animate-pulse rounded-[14px] bg-muted" />
            ))}
          </div>
        )}

        {failed && (
          <div className="flex flex-col items-center gap-2 px-1 py-6 text-center">
            <p role="alert" className="text-xs text-destructive">
              {errorMessage(search.error, "Search failed. Please try again.")}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="h-7 rounded-full text-xs focus-visible:ring-2 focus-visible:ring-brand/40"
              onClick={() => void search.refetch()}
            >
              Retry
            </Button>
          </div>
        )}

        {empty && (
          <p className="px-1 py-8 text-center text-xs text-subtle">
            No one found for “{trimmed}”.
          </p>
        )}

        {showList && (
          <ul
            id={listId}
            role="listbox"
            aria-label="Search results"
            className={cn("scrollbar-thin flex flex-col gap-0.5 overflow-y-auto", listClassName)}
          >
            {results.map((user, index) => {
              const selected = selectedIds?.has(user._id) ?? false;
              const pending = pendingId === user._id;
              const active = index === Math.min(activeIndex, results.length - 1);
              return (
                <li
                  key={user._id}
                  id={optionId(index)}
                  role="option"
                  aria-selected={selected}
                  aria-disabled={disabled}
                  ref={(node) => {
                    if (node && active) node.scrollIntoView({ block: "nearest" });
                  }}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseMove={() => setActiveIndex(index)}
                  onClick={() => !disabled && onSelect(user)}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-[14px] px-3 py-2 transition-colors",
                    active && "bg-foreground/[0.05]",
                    selected && "bg-brand/10",
                    disabled && !pending && "cursor-default opacity-50",
                  )}
                >
                  <Avatar name={user.name} seed={user._id} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-foreground">{user.name}</span>
                    <span className="block truncate font-mono text-[11px] text-subtle">{user.phone}</span>
                  </span>
                  {pending && (
                    <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Loader2 className="size-3.5 animate-spin" />
                      Opening…
                    </span>
                  )}
                  {selected && !pending && <Check aria-hidden className="size-4 text-brand" />}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
