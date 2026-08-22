"use client";

import { useState } from "react";
import { conversationTitle } from "@/features/conversations/helpers";
import {
  useAddParticipants,
  useLeaveGroup,
  usePromoteToAdmin,
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

function errorText(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

export function GroupDetailsDialog({
  group,
  currentUserId,
  open,
  onOpenChange,
  onLeft,
}: {
  group: GroupConversation;
  currentUserId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLeft: () => void;
}) {
  const isAdmin = group.admins.includes(currentUserId);

  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const renameMutation = useRenameGroup(group._id);

  const [addingOpen, setAddingOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [selectedNewMembers, setSelectedNewMembers] = useState<User[]>([]);
  const debouncedInput = useDebouncedValue(searchInput, 300);
  const trimmedSearch = debouncedInput.trim();
  const search = useUserSearch(debouncedInput);
  const addMutation = useAddParticipants(group._id);

  const [confirmingRemoveId, setConfirmingRemoveId] = useState<string | null>(null);
  const removeMutation = useRemoveParticipant(group._id);
  const promoteMutation = usePromoteToAdmin(group._id);

  const [confirmingLeave, setConfirmingLeave] = useState(false);
  const leaveMutation = useLeaveGroup(group._id, currentUserId);

  const memberIds = new Set(group.participants.map((p) => p._id));

  function resetTransientState() {
    setRenaming(false);
    setNameDraft("");
    setNameError(null);
    setAddingOpen(false);
    setSearchInput("");
    setSelectedNewMembers([]);
    setConfirmingRemoveId(null);
    setConfirmingLeave(false);
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
      // error handled in UI
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
      // error handled in UI
    }
  }

  async function handleRemove(userId: string) {
    try {
      await removeMutation.mutateAsync(userId);
    } finally {
      setConfirmingRemoveId(null);
    }
  }

  async function handleLeave() {
    try {
      await leaveMutation.mutateAsync();
      handleOpenChange(false);
      onLeft();
    } catch {
      // error handled in UI
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
      <DialogContent className="flex max-h-[85vh] flex-col gap-4 rounded-[24px] border border-[#171717]/[0.08] bg-[#FAFAF8] p-6 sm:max-w-md shadow-[0_16px_48px_rgba(23,23,23,0.08)]">
        <DialogHeader>
          <DialogTitle className="truncate text-lg font-bold tracking-tight text-[#171717]">{conversationTitle(group)}</DialogTitle>
          <DialogDescription className="text-xs text-[#626262]">
            {group.participants.length} members · {group.admins.length}{" "}
            {group.admins.length === 1 ? "admin" : "admins"}
          </DialogDescription>
        </DialogHeader>

        {/* Group name / rename */}
        <div className="flex items-center justify-between gap-2 border-b border-[#171717]/[0.06] pb-3">
          <div className="min-w-0">
            {renaming ? (
              <input
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
                className="h-8 rounded-lg border border-[#171717]/10 bg-white px-2.5 text-xs text-[#171717] outline-none focus:border-[#2878F0]"
              />
            ) : (
              <p className="truncate text-sm font-bold text-[#171717]">{group.name}</p>
            )}
          </div>
          {isAdmin &&
            (renaming ? (
              <div className="flex shrink-0 gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 rounded-full text-xs"
                  disabled={renameMutation.isPending}
                  onClick={() => {
                    setRenaming(false);
                    setNameDraft(group.name);
                    setNameError(null);
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  size="sm" 
                  className="h-7 rounded-full bg-[#171717] text-xs text-white" 
                  disabled={renameMutation.isPending} 
                  onClick={() => void handleRename()}
                >
                  {renameMutation.isPending ? "Saving…" : "Save"}
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="h-7 rounded-full text-xs border-[#171717]/10"
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
          <p role="alert" className="text-red-600 text-xs">
            {nameError}
          </p>
        )}
        {renameMutation.isError && (
          <p role="alert" className="text-red-600 text-xs">
            {errorText(renameMutation.error, "Could not rename the group. Please try again.")}
          </p>
        )}

        {/* Add members (admins only) */}
        {isAdmin && !addingOpen && (
          <button 
            type="button" 
            className="rounded-full bg-[#171717]/[0.05] hover:bg-[#171717]/[0.09] py-1.5 text-xs font-semibold text-[#171717] transition-colors"
            onClick={() => setAddingOpen(true)}
          >
            + Add members
          </button>
        )}
        {isAdmin && addingOpen && (
          <div className="flex flex-col gap-2 rounded-2xl border border-[#171717]/[0.08] bg-[#F5F5F3] p-3">
            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search by name to add people..."
              autoComplete="off"
              aria-label="Search users to add"
              disabled={addBusy}
              className="w-full h-8 rounded-lg border border-[#171717]/10 bg-white px-2.5 text-xs text-[#171717] outline-none focus:border-[#2878F0]"
            />
            {selectedNewMembers.length > 0 && (
              <ul className="flex flex-wrap gap-1.5" aria-label="Selected new members">
                {selectedNewMembers.map((user) => (
                  <li key={user._id}>
                    <button
                      type="button"
                      onClick={() => toggleNewMember(user)}
                      disabled={addBusy}
                      className="flex items-center gap-1 rounded-full bg-[#171717] px-2.5 py-0.5 text-[11px] font-medium text-white"
                      aria-label={`Remove ${user.name} from selection`}
                    >
                      <span>{user.name}</span>
                      <span aria-hidden>×</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex max-h-36 min-h-16 flex-col gap-1 overflow-y-auto">
              {showIdle && (
                <p className="text-[#8A8A86] px-1 py-2 text-center text-xs">
                  Search to add group members.
                </p>
              )}
              {showSearching && (
                <div className="flex flex-col gap-1.5 px-1 py-2" aria-label="Searching">
                  {Array.from({ length: 2 }).map((_, index) => (
                    <div key={index} className="h-8 bg-[#EAEAE7] animate-pulse rounded-[10px]" />
                  ))}
                </div>
              )}
              {showSearchError && (
                <div className="flex flex-col items-center gap-1 px-1 py-2 text-center">
                  <p className="text-red-600 text-xs">
                    {errorText(search.error, "Search failed. Please try again.")}
                  </p>
                </div>
              )}
              {showNoResults && (
                <p className="text-[#8A8A86] px-1 py-2 text-center text-xs">
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
                          className={`flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-left text-xs transition-colors ${
                            selected ? "bg-[#171717]/[0.08]" : "hover:bg-[#171717]/[0.04]"
                          }`}
                        >
                          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#EAEAE7] text-[10px] font-bold text-[#171717]">
                            {user.name.charAt(0).toUpperCase()}
                          </span>
                          <span className="min-w-0 flex-1 truncate font-medium text-[#171717]">{user.name}</span>
                          {selected && <span className="text-[10px] font-bold text-[#2878F0]">✓</span>}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            {addMutation.isError && (
              <p role="alert" className="text-red-600 px-1 text-xs">
                {errorText(addMutation.error, "Could not add members. Please try again.")}
              </p>
            )}
            <div className="flex justify-end gap-1 mt-1">
              <Button variant="ghost" size="sm" className="h-7 rounded-full text-xs" disabled={addBusy} onClick={() => setAddingOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="h-7 rounded-full bg-[#171717] text-xs text-white"
                disabled={addBusy || selectedNewMembers.length === 0}
                onClick={() => void handleAddMembers()}
              >
                {addBusy ? "Adding…" : `Add ${selectedNewMembers.length || ""}`.trim()}
              </Button>
            </div>
          </div>
        )}

        {/* Members */}
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#626262] mb-1">
            Members ({group.participants.length})
          </span>
          <ul className="flex min-h-0 max-h-48 flex-col gap-1 overflow-y-auto" aria-label="Members">
            {group.participants.map((participant) => {
              const admin = group.admins.includes(participant._id);
              const you = participant._id === currentUserId;
              const removable = isAdmin && !you;
              const confirming = confirmingRemoveId === participant._id;
              return (
                <li key={participant._id} className="flex items-center gap-3 rounded-xl px-2.5 py-1.5 hover:bg-[#171717]/[0.03]">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#EAEAE7] text-xs font-bold text-[#171717] border border-[#171717]/[0.06]">
                    {participant.name.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-[#171717]">
                      {participant.name}
                      {you && <span className="text-[#8A8A86] font-normal"> (you)</span>}
                    </p>
                    <p className="font-mono text-[10px] text-[#8A8A86] truncate">
                      {participant.phone}
                    </p>
                  </div>
                  {admin ? (
                    <span className="rounded-full bg-[#171717]/[0.06] px-2 py-0.5 text-[10px] font-semibold text-[#171717]">Admin</span>
                  ) : (
                    isAdmin &&
                    !you && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 rounded-full text-[10px] text-[#626262] hover:text-[#171717]"
                        disabled={promoteMutation.isPending}
                        onClick={() => void promoteMutation.mutateAsync(participant._id).catch(() => {})}
                      >
                        {promoteMutation.isPending && promoteMutation.variables === participant._id
                          ? "Promoting…"
                          : "Make admin"}
                      </Button>
                    )
                  )}
                  {removable &&
                    (confirming ? (
                      <span className="flex shrink-0 gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 rounded-full text-[10px]"
                          disabled={removeBusy}
                          onClick={() => setConfirmingRemoveId(null)}
                        >
                          No
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="h-6 rounded-full text-[10px]"
                          disabled={removeBusy}
                          onClick={() => void handleRemove(participant._id)}
                        >
                          {removeBusy ? "…" : "Remove"}
                        </Button>
                      </span>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 rounded-full text-[10px] text-[#8A8A86] hover:text-red-600"
                        onClick={() => setConfirmingRemoveId(participant._id)}
                      >
                        Remove
                      </Button>
                    ))}
                </li>
              );
            })}
          </ul>
        </div>

        {removeMutation.isError && (
          <p role="alert" className="text-red-600 text-xs">
            {errorText(removeMutation.error, "Could not remove the member. Please try again.")}
          </p>
        )}
        {promoteMutation.isError && (
          <p role="alert" className="text-red-600 text-xs">
            {errorText(promoteMutation.error, "Could not promote the member. Please try again.")}
          </p>
        )}

        {/* Leave group */}
        <div className="border-t border-[#171717]/[0.06] pt-3">
          {confirmingLeave ? (
            <div className="flex flex-col gap-2 rounded-xl border border-red-200 bg-red-50 p-3">
              <p className="text-xs font-bold text-red-700">Leave group?</p>
              <p className="text-[11px] text-red-600">
                You will no longer receive messages from this group.
              </p>
              <div className="flex justify-end gap-1 mt-1">
                <Button variant="ghost" size="sm" className="h-6 rounded-full text-[10px]" disabled={leaveMutation.isPending} onClick={() => setConfirmingLeave(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" size="sm" className="h-6 rounded-full text-[10px]" disabled={leaveMutation.isPending} onClick={() => void handleLeave()}>
                  {leaveMutation.isPending ? "Leaving…" : "Leave group"}
                </Button>
              </div>
            </div>
          ) : (
            <button 
              type="button"
              className="w-full text-center text-xs font-semibold text-red-600 hover:text-red-700 py-1 transition-colors"
              onClick={() => setConfirmingLeave(true)}
            >
              Leave group
            </button>
          )}
        </div>
        {leaveMutation.isError && (
          <p role="alert" className="text-red-600 text-xs">
            {errorText(leaveMutation.error, "Could not leave the group. Please try again.")}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
