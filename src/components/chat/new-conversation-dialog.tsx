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

interface NewConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
      <DialogContent className="rounded-[24px] border border-[#171717]/[0.08] bg-[#FAFAF8] p-6 sm:max-w-md shadow-[0_16px_48px_rgba(23,23,23,0.08)]">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold tracking-tight text-[#171717]">New conversation</DialogTitle>
          <DialogDescription className="text-xs text-[#626262]">
            Search for someone by name or phone number to start a direct chat.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2">
          <input
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search by name or phone..."
            autoComplete="off"
            aria-label="Search users"
            className="w-full h-10 rounded-xl border border-[#171717]/10 bg-white px-3.5 text-xs sm:text-sm text-[#171717] placeholder:text-[#8A8A86] outline-none transition-colors focus:border-[#2878F0] focus:ring-1 focus:ring-[#2878F0]"
          />
        </div>

        <div className="flex min-h-48 flex-col gap-2 mt-2">
          {showIdle && (
            <p className="text-[#8A8A86] px-1 py-8 text-center text-xs">
              Start typing to search users.
            </p>
          )}

          {showSearching && (
            <div className="flex flex-col gap-2 px-1 py-4" aria-label="Searching">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-11 bg-[#EAEAE7] animate-pulse rounded-[14px]" />
              ))}
            </div>
          )}

          {showError && (
            <div className="flex flex-col items-center gap-2 px-1 py-6 text-center">
              <p className="text-xs text-red-600">
                {search.error instanceof ApiError
                  ? search.error.message
                  : "Search failed. Please try again."}
              </p>
              <Button variant="outline" size="sm" className="h-7 rounded-full text-xs" onClick={() => search.refetch()}>
                Retry
              </Button>
            </div>
          )}

          {showNoResults && (
            <p className="text-[#8A8A86] px-1 py-8 text-center text-xs">
              No users found for “{trimmed}”.
            </p>
          )}

          {results.length > 0 && (
            <ul className="flex flex-col gap-1 overflow-y-auto max-h-60" aria-label="Search results">
              {results.map((user) => (
                <li key={user._id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(user._id)}
                    disabled={creating}
                    className="flex w-full items-center gap-3 rounded-[14px] px-3 py-2 text-left transition-colors hover:bg-[#171717]/[0.05] outline-none focus-visible:ring-1 focus-visible:ring-[#2878F0] disabled:opacity-50"
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#EAEAE7] text-xs font-bold text-[#171717] border border-[#171717]/[0.06]">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-bold text-[#171717]">{user.name}</span>
                      <span className="block truncate font-mono text-[10px] text-[#8A8A86]">
                        {user.phone}
                      </span>
                    </span>
                    {selectedUserId === user._id && creating && (
                      <span className="text-[10px] font-mono text-[#2878F0]">Opening…</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {startConversation.isError && (
            <p role="alert" className="text-red-600 px-1 text-xs">
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
