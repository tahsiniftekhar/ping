"use client";

import { useMemo, useState } from "react";
import { Loader2, Pencil, ShieldCheck, UserPlus, X } from "lucide-react";
import { conversationTitle } from "@/features/conversations/helpers";
import {
  useAddParticipants,
  useLeaveGroup,
  usePromoteToAdmin,
  useRemoveParticipant,
  useRenameGroup,
} from "@/features/conversations/queries";
import type { GroupConversation, User } from "@/types/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, GroupAvatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { dialogContentClass, errorMessage, fieldClass, UserSearch } from "./user-search";

const MAX_NAME = 50;
const ring = "outline-none focus-visible:ring-2 focus-visible:ring-brand/40";

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
  const addMutation = useAddParticipants(group._id);

  const [confirmingRemoveId, setConfirmingRemoveId] = useState<string | null>(null);
  const removeMutation = useRemoveParticipant(group._id);
  const promoteMutation = usePromoteToAdmin(group._id);

  const [confirmingLeave, setConfirmingLeave] = useState(false);
  const leaveMutation = useLeaveGroup(group._id, currentUserId);

  const memberIds = useMemo(() => new Set(group.participants.map((p) => p._id)), [group.participants]);
  const selectedIds = useMemo(() => new Set(selectedNewMembers.map((u) => u._id)), [selectedNewMembers]);

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
    } catch {
      // error handled in UI
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

  const addBusy = addMutation.isPending;
  const removeBusy = removeMutation.isPending;
  const adminCount = group.admins.length;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={dialogContentClass}>
        <DialogHeader className="flex-row items-center gap-3 pr-8">
          <GroupAvatar members={group.participants} seed={group._id} size="md" />
          <div className="min-w-0 flex-1">
            {renaming ? (
              <div className="relative">
                <DialogTitle className="sr-only">Rename {conversationTitle(group)}</DialogTitle>
                <input
                  type="text"
                  value={nameDraft}
                  onChange={(event) => setNameDraft(event.target.value)}
                  placeholder="Group name"
                  aria-label="Group name"
                  maxLength={MAX_NAME}
                  autoFocus
                  disabled={renameMutation.isPending}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void handleRename();
                    } else if (event.key === "Escape") {
                      event.stopPropagation();
                      setRenaming(false);
                      setNameError(null);
                    }
                  }}
                  className={cn(fieldClass, "h-9 pr-12")}
                />
                <span aria-hidden className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 font-mono text-[10px] text-subtle">
                  {nameDraft.length}/{MAX_NAME}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <DialogTitle className="truncate text-lg font-bold tracking-tight text-foreground">
                  {conversationTitle(group)}
                </DialogTitle>
                {isAdmin && (
                  <button
                    type="button"
                    aria-label="Rename group"
                    onClick={() => {
                      setNameDraft(group.name);
                      setRenaming(true);
                    }}
                    className={cn("flex size-7 shrink-0 items-center justify-center rounded-full text-subtle transition-colors hover:bg-foreground/[0.06] hover:text-foreground", ring)}
                  >
                    <Pencil className="size-3.5" />
                  </button>
                )}
              </div>
            )}
            <DialogDescription className="mt-1 text-xs text-muted-foreground">
              {group.participants.length} {group.participants.length === 1 ? "member" : "members"} · {adminCount}{" "}
              {adminCount === 1 ? "admin" : "admins"}
            </DialogDescription>
          </div>
        </DialogHeader>

        {renaming && (
          <div className="-mt-2 flex justify-end gap-1">
            <Button
              variant="ghost"
              size="sm"
              className={cn("h-7 rounded-full text-xs", ring)}
              disabled={renameMutation.isPending}
              onClick={() => {
                setRenaming(false);
                setNameError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className={cn("h-7 rounded-full bg-foreground text-xs text-background hover:bg-foreground/90", ring)}
              disabled={renameMutation.isPending}
              onClick={() => void handleRename()}
            >
              {renameMutation.isPending && <Loader2 className="size-3 animate-spin" />}
              {renameMutation.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        )}
        {nameError && (
          <p role="alert" className="-mt-2 text-xs text-destructive">
            {nameError}
          </p>
        )}
        {renameMutation.isError && (
          <p role="alert" className="-mt-2 text-xs text-destructive">
            {errorMessage(renameMutation.error, "Could not rename the group. Please try again.")}
          </p>
        )}

        <div className="scrollbar-thin -mx-1 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-1 py-0.5">
          {isAdmin && !addingOpen && (
            <button
              type="button"
              onClick={() => setAddingOpen(true)}
              className={cn("flex h-9 items-center justify-center gap-2 rounded-full bg-foreground/[0.05] text-xs font-semibold text-foreground transition-colors hover:bg-foreground/[0.09]", ring)}
            >
              <UserPlus aria-hidden className="size-4" />
              Add members
            </button>
          )}
          {isAdmin && addingOpen && (
            <section
              aria-label="Add members"
              className="flex flex-col gap-3 rounded-2xl border border-foreground/[0.08] bg-background p-3"
            >
              {selectedNewMembers.length > 0 && (
                <ul className="flex flex-wrap gap-1.5" aria-label="Selected new members">
                  {selectedNewMembers.map((user) => (
                    <li key={user._id}>
                      <button
                        type="button"
                        onClick={() => toggleNewMember(user)}
                        disabled={addBusy}
                        aria-label={`Remove ${user.name} from selection`}
                        className={cn("flex items-center gap-1.5 rounded-full bg-muted py-0.5 pr-2 pl-0.5 text-xs font-medium text-foreground transition-colors hover:bg-foreground/[0.1] disabled:opacity-50", ring)}
                      >
                        <Avatar name={user.name} seed={user._id} size="xs" />
                        <span className="max-w-28 truncate">{user.name}</span>
                        <X aria-hidden className="size-3 text-muted-foreground" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <UserSearch
                autoFocus
                query={searchInput}
                onQueryChange={setSearchInput}
                onSelect={toggleNewMember}
                selectedIds={selectedIds}
                excludeIds={memberIds}
                disabled={addBusy}
                placeholder="Search by name to add people"
                label="Search users by name to add"
                idleHint="Search by name to add members."
                listClassName="max-h-40"
              />
              {addMutation.isError && (
                <p role="alert" className="px-1 text-xs text-destructive">
                  {errorMessage(addMutation.error, "Could not add members. Please try again.")}
                </p>
              )}
              <div className="flex justify-end gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn("h-7 rounded-full text-xs", ring)}
                  disabled={addBusy}
                  onClick={() => setAddingOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className={cn("h-7 rounded-full bg-foreground text-xs text-background hover:bg-foreground/90", ring)}
                  disabled={addBusy || selectedNewMembers.length === 0}
                  onClick={() => void handleAddMembers()}
                >
                  {addBusy && <Loader2 className="size-3 animate-spin" />}
                  {addBusy ? "Adding…" : `Add ${selectedNewMembers.length || ""}`.trim()}
                </Button>
              </div>
            </section>
          )}

          <div className="flex flex-col gap-1">
            <h3 className="mb-1 px-1 text-[11px] font-bold tracking-[0.08em] text-muted-foreground uppercase">
              Members ({group.participants.length})
            </h3>
            <ul className="flex flex-col gap-0.5" aria-label="Members">
              {group.participants.map((participant) => {
                const admin = group.admins.includes(participant._id);
                const you = participant._id === currentUserId;
                const manageable = isAdmin && !you;
                const confirming = confirmingRemoveId === participant._id;
                const promoting = promoteMutation.isPending && promoteMutation.variables === participant._id;
                return (
                  <li
                    key={participant._id}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl px-2 py-1.5 hover:bg-foreground/[0.03]"
                  >
                    <Avatar name={participant.name} seed={participant._id} size="sm" />
                    <div className="min-w-0 flex-1 basis-32">
                      <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                        <span className="truncate">{participant.name}</span>
                        {you && (
                          <span className="shrink-0 rounded-full bg-foreground/[0.06] px-1.5 py-px text-[10px] font-medium text-muted-foreground">
                            You
                          </span>
                        )}
                        {admin && (
                          <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-brand/10 px-1.5 py-px text-[10px] font-semibold text-brand-strong">
                            <ShieldCheck aria-hidden className="size-3" />
                            Admin
                          </span>
                        )}
                      </p>
                      <p className="truncate font-mono text-[11px] text-subtle">{participant.phone}</p>
                    </div>
                    {manageable && !confirming && (
                      <div className="flex shrink-0 items-center">
                        {!admin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className={cn("h-7 rounded-full px-2 text-[11px] text-muted-foreground hover:text-foreground", ring)}
                            disabled={promoteMutation.isPending}
                            onClick={() => void promoteMutation.mutateAsync(participant._id).catch(() => {})}
                          >
                            {promoting && <Loader2 className="size-3 animate-spin" />}
                            {promoting ? "Promoting…" : "Make admin"}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className={cn("h-7 rounded-full px-2 text-[11px] text-subtle hover:text-destructive", ring)}
                          onClick={() => setConfirmingRemoveId(participant._id)}
                          aria-label={`Remove ${participant.name}`}
                        >
                          Remove
                        </Button>
                      </div>
                    )}
                    {manageable && confirming && (
                      <div className="flex w-full items-center justify-end gap-1 pl-11">
                        <span className="mr-auto text-[11px] text-destructive">Remove from group?</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={cn("h-7 rounded-full px-2 text-[11px]", ring)}
                          disabled={removeBusy}
                          onClick={() => setConfirmingRemoveId(null)}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          className={cn("h-7 rounded-full px-2.5 text-[11px]", ring)}
                          disabled={removeBusy}
                          onClick={() => void handleRemove(participant._id)}
                        >
                          {removeBusy && <Loader2 className="size-3 animate-spin" />}
                          Remove
                        </Button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {removeMutation.isError && (
            <p role="alert" className="text-xs text-destructive">
              {errorMessage(removeMutation.error, "Could not remove the member. Please try again.")}
            </p>
          )}
          {promoteMutation.isError && (
            <p role="alert" className="text-xs text-destructive">
              {errorMessage(promoteMutation.error, "Could not promote the member. Please try again.")}
            </p>
          )}
        </div>

        <div className="border-t border-foreground/[0.08] pt-3">
          {confirmingLeave ? (
            <div className="flex flex-col gap-2 rounded-xl border border-destructive/25 bg-destructive/10 p-3">
              <p className="text-xs font-bold text-destructive">Leave group?</p>
              <p className="text-[11px] text-destructive">
                You will no longer receive messages from this group.
              </p>
              <div className="mt-1 flex justify-end gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn("h-7 rounded-full text-xs", ring)}
                  disabled={leaveMutation.isPending}
                  onClick={() => setConfirmingLeave(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className={cn("h-7 rounded-full text-xs", ring)}
                  disabled={leaveMutation.isPending}
                  onClick={() => void handleLeave()}
                >
                  {leaveMutation.isPending && <Loader2 className="size-3 animate-spin" />}
                  {leaveMutation.isPending ? "Leaving…" : "Leave group"}
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className={cn("w-full rounded-full py-1.5 text-center text-xs font-semibold text-destructive transition-colors hover:bg-destructive/10", ring)}
              onClick={() => setConfirmingLeave(true)}
            >
              Leave group
            </button>
          )}
          {leaveMutation.isError && (
            <p role="alert" className="mt-2 text-xs text-destructive">
              {errorMessage(leaveMutation.error, "Could not leave the group. Please try again.")}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
