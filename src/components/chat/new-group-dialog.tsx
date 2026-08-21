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
import { Input } from "@/components/ui/input";

interface NewGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the id of the newly created group. */
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
    // The creator (you) is added automatically, so 2 selections make 3 members.
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
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New group</DialogTitle>
          <DialogDescription>
            Name your group and add at least 2 other people. You become the group admin.
          </DialogDescription>
        </DialogHeader>

        <Input
          type="text"
          value={groupName}
          onChange={(event) => setGroupName(event.target.value)}
          placeholder="Group name"
          autoComplete="off"
          disabled={submitting}
          aria-label="Group name"
        />

        {selectedUsers.length > 0 && (
          <ul className="flex flex-wrap gap-1.5" aria-label="Selected members">
            {selectedUsers.map((user) => (
              <li key={user._id}>
                <button
                  type="button"
                  onClick={() => toggleSelected(user)}
                  disabled={submitting}
                  className="bg-muted hover:bg-muted/70 flex items-center gap-1 rounded-full px-2.5 py-1 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={`Remove ${user.name}`}
                >
                  {user.name}
                  <span aria-hidden>×</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <Input
          type="search"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Search by name to add people"
          autoComplete="off"
          disabled={submitting}
          aria-label="Search users"
        />

        <div className="flex min-h-36 flex-col gap-2 overflow-y-auto">
          {showIdle && (
            <p className="text-muted-foreground px-1 py-6 text-center text-sm">
              Search to add group members.
            </p>
          )}

          {showSearching && (
            <div className="flex flex-col gap-2 px-1 py-3" aria-label="Searching">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="bg-muted h-11 animate-pulse rounded-md" />
              ))}
            </div>
          )}

          {showError && (
            <div className="flex flex-col items-center gap-2 px-1 py-4 text-center">
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
            <p className="text-muted-foreground px-1 py-6 text-center text-sm">
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
                      className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 ${
                        selected ? "bg-muted" : "hover:bg-muted/50"
                      }`}
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
                      {selected && <span className="text-xs">✓</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {validationError && (
          <p role="alert" className="text-destructive px-1 text-sm">
            {validationError}
          </p>
        )}
        {createGroupMutation.isError && (
          <p role="alert" className="text-destructive px-1 text-sm">
            {createGroupMutation.error instanceof ApiError
              ? createGroupMutation.error.message
              : "Could not create the group. Please try again."}
          </p>
        )}

        <Button type="button" onClick={() => void handleCreate()} disabled={submitting}>
          {submitting ? "Creating…" : "Create group"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
