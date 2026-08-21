"use client";

import { useState } from "react";
import { conversationTitle } from "@/features/conversations/helpers";
import { useRenameGroup } from "@/features/conversations/queries";
import { ApiError } from "@/lib/api/client";
import type { GroupConversation } from "@/types/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Group details + rename (admins only). Authorization is enforced by the API;
 * the UI merely hides rename controls for non-admins using `group.admins`.
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
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const renameMutation = useRenameGroup(group._id);
  const submitting = renameMutation.isPending;

  // Reset transient state whenever the dialog closes.
  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setRenaming(false);
      setNameDraft("");
      setValidationError(null);
    }
    onOpenChange(nextOpen);
  }

  async function handleRename() {
    const name = nameDraft.trim();
    if (name.length === 0) {
      setValidationError("Group name cannot be empty.");
      return;
    }
    setValidationError(null);
    try {
      await renameMutation.mutateAsync(name);
      setRenaming(false);
      setNameDraft("");
    } catch {
      // API error is rendered below; the dialog stays open for retry.
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="truncate">{conversationTitle(group)}</DialogTitle>
          <DialogDescription>
            {group.participants.length} members · {group.admins.length}{" "}
            {group.admins.length === 1 ? "admin" : "admins"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            {renaming ? (
              <Input
                type="text"
                value={nameDraft}
                onChange={(event) => setNameDraft(event.target.value)}
                placeholder="Group name"
                aria-label="Group name"
                disabled={submitting}
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
                  disabled={submitting}
                  onClick={() => {
                    setRenaming(false);
                    setNameDraft(group.name);
                    setValidationError(null);
                  }}
                >
                  Cancel
                </Button>
                <Button size="sm" disabled={submitting} onClick={() => void handleRename()}>
                  {submitting ? "Saving…" : "Save"}
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

        {validationError && (
          <p role="alert" className="text-destructive text-sm">
            {validationError}
          </p>
        )}
        {renameMutation.isError && (
          <p role="alert" className="text-destructive text-sm">
            {renameMutation.error instanceof ApiError
              ? renameMutation.error.message
              : "Could not rename the group. Please try again."}
          </p>
        )}

        <ul className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto" aria-label="Members">
          {group.participants.map((participant) => {
            const admin = group.admins.includes(participant._id);
            const you = participant._id === currentUserId;
            return (
              <li
                key={participant._id}
                className="flex items-center gap-3 rounded-md px-2 py-1.5"
              >
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
                  <span className="bg-muted shrink-0 rounded-full px-2 py-0.5 text-xs">
                    Admin
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
