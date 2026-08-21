"use client";

import { useState } from "react";
import { conversationTitle } from "@/features/conversations/helpers";
import {
  useAddParticipants,
  useRemoveParticipant,
  useRenameGroup,
} from "@/features/conversations/queries";
import { useUserSearch } from "@/features/users/queries";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { ApiError } from "@/lib/api/client";
import type { GroupConversation, User } from "@/types/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function errorText(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

/**
 * Group details: members, rename, add/remove participants (admins only).
 * Authorization is enforced by the API; the UI hides controls for non-admins
 * using `group.admins`. Membership changes are never optimistic — the REST
 * result plus list invalidation is the authority.
 */
export function GroupDetailsDialog({
  group,
  currentUserId,
  open,
  onOpenChange,
}: {
  group: GroupConversation;
  currentUserId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const isAdmin = group.admins.includes(currentUserId);

  // rename
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const renameMutation = useRenameGroup(group._id);

  // add members
  const [addingOpen, setAddingOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [selectedNewMembers, setSelectedNewMembers] = useState<User[]>([]);
  const debouncedInput = useDebouncedValue(searchInput, 300);
  const trimmedSearch = debouncedInput.trim();
  const search = useUserSearch(debouncedInput);
  const addMutation = useAddParticipants(group._id);

  // remove member: id of the member pending a confirm click
  const [confirmingRemoveId, setConfirmingRemoveId] = useState<string | null>(null);
  const removeMutation = useRemoveParticipant(group._id);

  const memberIds = new Set(group.participants.map((p) => p._id));

  function resetTransientState() {
    setRenaming(false);
    setNameDraft("");
    setNameError(null);
    setAddingOpen(false);
    setSearchInput("");
    setSelectedNewMembers([]);
    setConfirmingRemoveId(null);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) resetTransientState();
    onOpenChange(nextOpen);
  }

  async function handleRename() {
    const name = nameDraft.trim();
    if (name.length === 0) {
      setNameError("Group name cannot be empty.");
      return;
    }
    setNameError(null);
    try {
      await renameMutation.mutateAsync(name);
      setRenaming(false);
    } catch {
      // error rendered below; stay in rename mode
    }
  }

  function toggleNewMember(user: User) {
    setSelectedNewMembers((previous) =>
      previous.some((selected) => selected._id === user._id)
        ? previous.filter((selected) => selected._id !== user._id)
        : [...previous, user],
    );
  }

  async function handleAddMembers() {
    if (selectedNewMembers.length === 0) return;
    try {
      await addMutation.mutateAsync(selectedNewMembers.map((user) => user._id));
      setSelectedNewMembers([]);
      setSearchInput("");
      setAddingOpen(false);
    } catch {
      // error rendered below; selections kept for retry
    }
  }

  async function handleRemove(userId: string) {
    try {
      await removeMutation.mutateAsync(userId);
    } finally {
      setConfirmingRemoveId(null);
    }
  }

  const showIdle = trimmedSearch.length === 0;
  const showSearching = !showIdle && search.isFetching && !search.data;
  const showSearchError = search.isError;
  const showNoResults =
    !showIdle && !showSearching && !showSearchError && (search.data?.length ?? 0) === 0;
  const searchResults = (search.data ?? []).filter((user) => !memberIds.has(user._id));
  const addBusy = addMutation.isPending;
  const removeBusy = removeMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-3 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="truncate">{conversationTitle(group)}</DialogTitle>
          <DialogDescription>
            {group.participants.length} members · {group.admins.length}{" "}
            {group.admins.length === 1 ? "admin" : "admins"}
          </DialogDescription>
        </DialogHeader>

        {/* Group name / rename */}
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            {renaming ? (
              <Input
                type="text"
                value={nameDraft}
                onChange={(event) => setNameDraft(event.target.value)}
                placeholder="Group name"
                aria-label="Group name"
                disabled={renameMutation.isPending}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void handleRename();
                  }
                }}
              />
            ) : (
              <p className="truncate text-sm font-medium">{group.name}</p>
            )}
          </div>
          {isAdmin &&
            (renaming ? (
              <div className="flex shrink-0 gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={renameMutation.isPending}
                  onClick={() => {
                    setRenaming(false);
                    setNameDraft(group.name);
                    setNameError(null);
                  }}
                >
                  Cancel
                </Button>
                <Button size="sm" disabled={renameMutation.isPending} onClick={() => void handleRename()}>
                  {renameMutation.isPending ? "Saving…" : "Save"}
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() => {
                  setNameDraft(group.name);
                  setRenaming(true);
                }}
              >
                Rename
              </Button>
            ))}
        </div>

        {nameError && (
          <p role="alert" className="text-destructive text-sm">
            {nameError}
          </p>
        )}
        {renameMutation.isError && (
          <p role="alert" className="text-destructive text-sm">
            {errorText(renameMutation.error, "Could not rename the group. Please try again.")}
          </p>
        )}

        {/* Add members (admins only) */}
        {isAdmin && !addingOpen && (
          <Button variant="outline" size="sm" onClick={() => setAddingOpen(true)}>
            Add members
          </Button>
        )}
        {isAdmin && addingOpen && (
          <div className="flex flex-col gap-2 rounded-md border p-2">
            <Input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search by name to add people"
              autoComplete="off"
              aria-label="Search users to add"
              disabled={addBusy}
            />
            {selectedNewMembers.length > 0 && (
              <ul className="flex flex-wrap gap-1.5" aria-label="Selected new members">
                {selectedNewMembers.map((user) => (
                  <li key={user._id}>
                    <button
                      type="button"
                      onClick={() => toggleNewMember(user)}
                      disabled={addBusy}
                      className="bg-muted hover:bg-muted/70 flex items-center gap-1 rounded-full px-2.5 py-1 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label={`Remove ${user.name} from selection`}
                    >
                      {user.name}
                      <span aria-hidden>×</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex max-h-40 min-h-20 flex-col gap-1 overflow-y-auto">
              {showIdle && (
                <p className="text-muted-foreground px-1 py-3 text-center text-xs">
                  Search to add group members.
                </p>
              )}
              {showSearching && (
                <div className="flex flex-col gap-2 px-1 py-2" aria-label="Searching">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="bg-muted h-10 animate-pulse rounded-md" />
                  ))}
                </div>
              )}
              {showSearchError && (
                <div className="flex flex-col items-center gap-1 px-1 py-2 text-center">
                  <p className="text-destructive text-xs">
                    {errorText(search.error, "Search failed. Please try again.")}
                  </p>
                  <Button variant="outline" size="sm" onClick={() => search.refetch()}>
                    Retry
                  </Button>
                </div>
              )}
              {showNoResults && (
                <p className="text-muted-foreground px-1 py-3 text-center text-xs">
                  No users found for “{trimmedSearch}”.
                </p>
              )}
              {searchResults.length > 0 && (
                <ul className="flex flex-col gap-1" aria-label="Addable search results">
                  {searchResults.map((user) => {
                    const selected = selectedNewMembers.some((s) => s._id === user._id);
                    return (
                      <li key={user._id}>
                        <button
                          type="button"
                          onClick={() => toggleNewMember(user)}
                          disabled={addBusy}
                          aria-pressed={selected}
                          className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 ${
                            selected ? "bg-muted" : "hover:bg-muted/50"
                          }`}
                        >
                          <span className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                            {user.name.charAt(0).toUpperCase()}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm">{user.name}</span>
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
            {addMutation.isError && (
              <p role="alert" className="text-destructive px-1 text-sm">
                {errorText(addMutation.error, "Could not add members. Please try again.")}
              </p>
            )}
            <div className="flex justify-end gap-1">
              <Button variant="ghost" size="sm" disabled={addBusy} onClick={() => setAddingOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={addBusy || selectedNewMembers.length === 0}
                onClick={() => void handleAddMembers()}
              >
                {addBusy ? "Adding…" : `Add ${selectedNewMembers.length || ""}`.trim()}
              </Button>
            </div>
          </div>
        )}

        {/* Members */}
        <ul className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto" aria-label="Members">
          {group.participants.map((participant) => {
            const admin = group.admins.includes(participant._id);
            const you = participant._id === currentUserId;
            const removable = isAdmin && !you;
            const confirming = confirmingRemoveId === participant._id;
            return (
              <li key={participant._id} className="flex items-center gap-3 rounded-md px-2 py-1.5">
                <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
                  {participant.name.charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {participant.name}
                    {you && <span className="text-muted-foreground font-normal"> (you)</span>}
                  </span>
                  <span className="text-muted-foreground block truncate text-xs">
                    {participant.phone}
                  </span>
                </span>
                {admin && (
                  <span className="bg-muted shrink-0 rounded-full px-2 py-0.5 text-xs">Admin</span>
                )}
                {removable &&
                  (confirming ? (
                    <span className="flex shrink-0 gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={removeBusy}
                        onClick={() => setConfirmingRemoveId(null)}
                      >
                        No
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={removeBusy}
                        onClick={() => void handleRemove(participant._id)}
                      >
                        {removeBusy ? "Removing…" : "Remove"}
                      </Button>
                    </span>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground shrink-0"
                      onClick={() => setConfirmingRemoveId(participant._id)}
                    >
                      Remove
                    </Button>
                  ))}
              </li>
            );
          })}
        </ul>

        {removeMutation.isError && (
          <p role="alert" className="text-destructive text-sm">
            {errorText(removeMutation.error, "Could not remove the member. Please try again.")}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
