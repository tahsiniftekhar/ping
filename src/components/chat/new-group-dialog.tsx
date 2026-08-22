"use client";

import { useState } from "react";
import { useUserSearch } from "@/features/users/queries";
import { useCreateGroup } from "@/features/conversations/queries";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { ApiError } from "@/lib/api/client";
import type { User } from "@/types/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface NewGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGroupCreated: (conversationId: string) => void;
}

export function NewGroupDialog({
  open,
  onOpenChange,
  onGroupCreated,
}: NewGroupDialogProps) {
  const [groupName, setGroupName] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);

  const debouncedInput = useDebouncedValue(searchInput, 300);
  const trimmed = debouncedInput.trim();
  const search = useUserSearch(debouncedInput);
  const createGroupMutation = useCreateGroup();
  const submitting = createGroupMutation.isPending;

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setGroupName("");
      setSearchInput("");
      setSelectedUsers([]);
      setValidationError(null);
    }
    onOpenChange(nextOpen);
  }

  function toggleSelected(user: User) {
    setValidationError(null);
    setSelectedUsers((previous) =>
      previous.some((selected) => selected._id === user._id)
        ? previous.filter((selected) => selected._id !== user._id)
        : [...previous, user],
    );
  }

  async function handleCreate() {
    const name = groupName.trim();
    if (name.length === 0) {
      setValidationError("Please give the group a name.");
      return;
    }
    if (selectedUsers.length < 2) {
      setValidationError("Select at least 2 other people to create a group.");
      return;
    }
    setValidationError(null);
    try {
      const group = await createGroupMutation.mutateAsync({
        name,
        participantIds: selectedUsers.map((user) => user._id),
      });
      handleOpenChange(false);
      onGroupCreated(group._id);
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
      <DialogContent className="flex max-h-[85vh] flex-col rounded-[24px] border border-[#171717]/[0.08] bg-[#FAFAF8] p-6 sm:max-w-md shadow-[0_16px_48px_rgba(23,23,23,0.08)]">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold tracking-tight text-[#171717]">New group</DialogTitle>
          <DialogDescription className="text-xs text-[#626262]">
            Name your group and add at least 2 other people. You become the group admin.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 mt-1">
          <input
            type="text"
            value={groupName}
            onChange={(event) => setGroupName(event.target.value)}
            placeholder="Group name"
            autoComplete="off"
            disabled={submitting}
            aria-label="Group name"
            className="w-full h-10 rounded-xl border border-[#171717]/10 bg-white px-3.5 text-xs sm:text-sm text-[#171717] placeholder:text-[#8A8A86] outline-none transition-colors focus:border-[#2878F0] focus:ring-1 focus:ring-[#2878F0] disabled:opacity-50"
          />

          {selectedUsers.length > 0 && (
            <ul className="flex flex-wrap gap-1.5" aria-label="Selected members">
              {selectedUsers.map((user) => (
                <li key={user._id}>
                  <button
                    type="button"
                    onClick={() => toggleSelected(user)}
                    disabled={submitting}
                    className="flex items-center gap-1.5 rounded-full bg-[#171717] px-3 py-1 text-xs font-medium text-white transition-opacity hover:opacity-80 outline-none"
                    aria-label={`Remove ${user.name}`}
                  >
                    <span>{user.name}</span>
                    <span aria-hidden className="text-white/60">×</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <input
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search by name to add people..."
            autoComplete="off"
            disabled={submitting}
            aria-label="Search users"
            className="w-full h-10 rounded-xl border border-[#171717]/10 bg-white px-3.5 text-xs sm:text-sm text-[#171717] placeholder:text-[#8A8A86] outline-none transition-colors focus:border-[#2878F0] focus:ring-1 focus:ring-[#2878F0] disabled:opacity-50"
          />
        </div>

        <div className="flex min-h-36 flex-col gap-2 overflow-y-auto mt-1">
          {showIdle && (
            <p className="text-[#8A8A86] px-1 py-6 text-center text-xs">
              Search to add group members.
            </p>
          )}

          {showSearching && (
            <div className="flex flex-col gap-2 px-1 py-3" aria-label="Searching">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-10 bg-[#EAEAE7] animate-pulse rounded-[14px]" />
              ))}
            </div>
          )}

          {showError && (
            <div className="flex flex-col items-center gap-2 px-1 py-4 text-center">
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
            <p className="text-[#8A8A86] px-1 py-6 text-center text-xs">
              No users found for “{trimmed}”.
            </p>
          )}

          {results.length > 0 && (
            <ul className="flex flex-col gap-1" aria-label="Search results">
              {results.map((user) => {
                const selected = selectedUsers.some((s) => s._id === user._id);
                return (
                  <li key={user._id}>
                    <button
                      type="button"
                      onClick={() => toggleSelected(user)}
                      disabled={submitting}
                      aria-pressed={selected}
                      className={`flex w-full items-center gap-3 rounded-[14px] px-3 py-2 text-left transition-colors outline-none focus-visible:ring-1 focus-visible:ring-[#2878F0] disabled:opacity-50 ${
                        selected ? "bg-[#171717]/[0.08]" : "hover:bg-[#171717]/[0.04]"
                      }`}
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
                      {selected && <span className="text-xs font-bold text-[#2878F0]">✓</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {validationError && (
          <p role="alert" className="text-red-600 px-1 text-xs">
            {validationError}
          </p>
        )}
        {createGroupMutation.isError && (
          <p role="alert" className="text-red-600 px-1 text-xs">
            {createGroupMutation.error instanceof ApiError
              ? createGroupMutation.error.message
              : "Could not create the group. Please try again."}
          </p>
        )}

        <button
          type="button"
          onClick={() => void handleCreate()}
          disabled={submitting}
          className="mt-2 h-10 rounded-full bg-[#171717] text-xs font-semibold text-white shadow-none transition-all hover:bg-[#171717]/90 active:scale-[0.98] disabled:opacity-50"
        >
          {submitting ? "Creating…" : "Create group"}
        </button>
      </DialogContent>
    </Dialog>
  );
}
