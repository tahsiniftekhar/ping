"use client";

import { useState } from "react";
import { useUserSearch } from "@/features/users/queries";
import { useStartDirectConversation } from "@/features/conversations/queries";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { ApiError } from "@/lib/api/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface NewConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the id of the opened/created conversation. */
  onConversationOpened: (conversationId: string) => void;
}

export function NewConversationDialog({
  open,
  onOpenChange,
  onConversationOpened,
}: NewConversationDialogProps) {
  const [searchInput, setSearchInput] = useState("");
  const debouncedInput = useDebouncedValue(searchInput, 300);
  const trimmed = debouncedInput.trim();

  const search = useUserSearch(debouncedInput);
  const startConversation = useStartDirectConversation();
  const creating = startConversation.isPending;
  const selectedUserId = startConversation.variables;

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) setSearchInput("");
    onOpenChange(nextOpen);
  }

  async function handleSelect(userId: string) {
    try {
      const conversation = await startConversation.mutateAsync(userId);
      handleOpenChange(false);
      onConversationOpened(conversation._id);
    } catch {
      // Mutation error is rendered below; dialog stays open for retry.
    }
  }

  const showIdle = trimmed.length === 0;
  const showSearching = !showIdle && search.isFetching && !search.data;
  const showError = search.isError;
  const showNoResults = !showIdle && !showSearching && !showError && (search.data?.length ?? 0) === 0;
  const results = search.data ?? [];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New conversation</DialogTitle>
          <DialogDescription>
            Search for someone by name or phone number to start a direct chat.
          </DialogDescription>
        </DialogHeader>

        <Input
          type="search"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Search by name or phone"
          autoComplete="off"
          aria-label="Search users"
        />

        <div className="flex min-h-48 flex-col gap-2">
          {showIdle && (
            <p className="text-muted-foreground px-1 py-8 text-center text-sm">
              Start typing to search.
            </p>
          )}

          {showSearching && (
            <div className="flex flex-col gap-2 px-1 py-4" aria-label="Searching">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="bg-muted h-12 animate-pulse rounded-md" />
              ))}
            </div>
          )}

          {showError && (
            <div className="flex flex-col items-center gap-2 px-1 py-6 text-center">
              <p className="text-destructive text-sm">
                {search.error instanceof ApiError
                  ? search.error.message
                  : "Search failed. Please try again."}
              </p>
              <Button variant="outline" size="sm" onClick={() => search.refetch()}>
                Retry
              </Button>
            </div>
          )}

          {showNoResults && (
            <p className="text-muted-foreground px-1 py-8 text-center text-sm">
              No users found for “{trimmed}”.
            </p>
          )}

          {results.length > 0 && (
            <ul className="flex flex-col gap-1 overflow-y-auto" aria-label="Search results">
              {results.map((user) => (
                <li key={user._id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(user._id)}
                    disabled={creating}
                    className="hover:bg-muted flex w-full items-center gap-3 rounded-md px-3 py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
                  >
                    <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{user.name}</span>
                      <span className="text-muted-foreground block truncate text-xs">
                        {user.phone}
                      </span>
                    </span>
                    {selectedUserId === user._id && creating && (
                      <span className="text-muted-foreground text-xs">Opening…</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {startConversation.isError && (
            <p role="alert" className="text-destructive px-1 text-sm">
              {startConversation.error instanceof ApiError
                ? startConversation.error.message
                : "Could not open the conversation. Please try again."}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
