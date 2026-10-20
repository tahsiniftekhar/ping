"use client";

import { useMemo, useState } from "react";
import { Loader2, Users, X } from "lucide-react";
import { useCreateGroup } from "@/features/conversations/queries";
import type { User } from "@/types/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { dialogContentClass, errorMessage, fieldClass, UserSearch } from "./user-search";

interface NewGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGroupCreated: (conversationId: string) => void;
}

const MAX_NAME = 50;
const MIN_OTHERS = 2;

export function NewGroupDialog({
  open,
  onOpenChange,
  onGroupCreated,
}: NewGroupDialogProps) {
  const [groupName, setGroupName] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const createGroupMutation = useCreateGroup();
  const submitting = createGroupMutation.isPending;

  const selectedIds = useMemo(() => new Set(selectedUsers.map((u) => u._id)), [selectedUsers]);
  const name = groupName.trim();
  const missing = Math.max(0, MIN_OTHERS - selectedUsers.length);
  const valid = name.length > 0 && missing === 0;

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setGroupName("");
      setSearchInput("");
      setSelectedUsers([]);
    }
    onOpenChange(nextOpen);
  }

  function toggleSelected(user: User) {
    setSelectedUsers((previous) =>
      previous.some((selected) => selected._id === user._id)
        ? previous.filter((selected) => selected._id !== user._id)
        : [...previous, user],
    );
  }

  async function handleCreate() {
    if (!valid || submitting) return;
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

  const helper =
    name.length === 0 && missing > 0
      ? `Name your group and add at least ${missing} more ${missing === 1 ? "person" : "people"}.`
      : name.length === 0
        ? "Give your group a name."
        : missing > 0
          ? `Add at least ${missing} more ${missing === 1 ? "person" : "people"}.`
          : `${selectedUsers.length} members selected. You will be the admin.`;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={dialogContentClass}>
        <DialogHeader className="flex-row items-center gap-3 pr-8">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
            <Users aria-hidden className="size-5" />
          </span>
          <div className="min-w-0">
            <DialogTitle className="text-lg font-bold tracking-tight text-foreground">New group</DialogTitle>
            <DialogDescription className="mt-1 text-xs text-muted-foreground">
              Groups need you plus at least 2 other people.
            </DialogDescription>
          </div>
        </DialogHeader>

        <form
          className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto scrollbar-thin px-0.5 py-0.5"
          onSubmit={(event) => {
            event.preventDefault();
            void handleCreate();
          }}
        >
          <div className="flex flex-col gap-1.5">
            <div className="relative">
              <input
                type="text"
                value={groupName}
                onChange={(event) => setGroupName(event.target.value)}
                placeholder="Group name"
                maxLength={MAX_NAME}
                autoComplete="off"
                autoFocus
                disabled={submitting}
                aria-label="Group name"
                className={cn(fieldClass, "pr-14")}
              />
              <span
                aria-hidden
                className={cn(
                  "pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 font-mono text-[10px]",
                  groupName.length >= MAX_NAME ? "text-destructive" : "text-subtle",
                )}
              >
                {groupName.length}/{MAX_NAME}
              </span>
            </div>
          </div>

          {selectedUsers.length > 0 && (
            <ul className="flex flex-wrap gap-1.5" aria-label="Selected members">
              {selectedUsers.map((user) => (
                <li key={user._id}>
                  <button
                    type="button"
                    onClick={() => toggleSelected(user)}
                    disabled={submitting}
                    aria-label={`Remove ${user.name}`}
                    className="flex items-center gap-1.5 rounded-full bg-muted py-0.5 pr-2 pl-0.5 text-xs font-medium text-foreground transition-colors outline-none hover:bg-foreground/[0.1] focus-visible:ring-2 focus-visible:ring-brand/40 disabled:opacity-50"
                  >
                    <Avatar name={user.name} seed={user._id} size="xs" />
                    <span className="max-w-32 truncate">{user.name}</span>
                    <X aria-hidden className="size-3 text-muted-foreground" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <UserSearch
            query={searchInput}
            onQueryChange={setSearchInput}
            onSelect={toggleSelected}
            selectedIds={selectedIds}
            disabled={submitting}
            placeholder="Search by name to add people"
            label="Search users by name to add"
            idleHint="Search by name to add members."
            listClassName="max-h-48"
          />
        </form>

        {createGroupMutation.isError && (
          <p role="alert" className="px-1 text-xs text-destructive">
            {errorMessage(createGroupMutation.error, "Could not create the group. Please try again.")}
          </p>
        )}

        <div className="flex items-center justify-between gap-3">
          <p aria-live="polite" className={cn("min-w-0 text-xs", valid ? "text-success" : "text-muted-foreground")}>
            {helper}
          </p>
          <button
            type="button"
            onClick={() => void handleCreate()}
            disabled={!valid || submitting}
            className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-full bg-foreground px-5 text-xs font-semibold text-background transition-all outline-none hover:bg-foreground/90 focus-visible:ring-2 focus-visible:ring-brand/40 active:scale-[0.98] disabled:opacity-40"
          >
            {submitting && <Loader2 className="size-3.5 animate-spin" />}
            {submitting ? "Creating…" : "Create group"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
