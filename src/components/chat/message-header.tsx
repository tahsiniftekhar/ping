import { ArrowLeft, Users } from "lucide-react";
import { Avatar, GroupAvatar } from "@/components/ui/avatar";
import { conversationTitle } from "@/features/conversations/helpers";
import { memberSummary } from "@/features/messages/helpers";
import type { Conversation } from "@/types/api";

export function ConversationAvatar({
  conversation,
  size,
}: {
  conversation: Conversation;
  size: "sm" | "md" | "lg";
}) {
  if (conversation.type === "group") {
    return (
      <GroupAvatar
        members={conversation.participants}
        seed={conversation._id}
        size={size === "sm" ? "sm" : "md"}
      />
    );
  }
  return <Avatar name={conversation.participant.name} seed={conversation.participant._id} size={size} />;
}

export function MessageHeader({
  conversation,
  currentUserId,
  connected,
  onBack,
  onOpenDetails,
}: {
  conversation: Conversation;
  currentUserId: string;
  connected: boolean;
  onBack?: () => void;
  onOpenDetails: () => void;
}) {
  const subtitle =
    conversation.type === "direct"
      ? conversation.participant.phone
      : conversation.participants.length > 0
        ? memberSummary(conversation.participants, currentUserId)
        : "No members";

  return (
    <header className="flex min-h-14 items-center justify-between gap-3 border-b border-foreground/[0.08] bg-card px-4 py-2.5 sm:px-5">
      <div className="flex min-w-0 items-center gap-2.5">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to conversations"
            className="-ml-1 flex size-8 shrink-0 items-center justify-center rounded-full text-foreground transition-colors hover:bg-foreground/[0.06] md:hidden"
          >
            <ArrowLeft className="size-4" />
          </button>
        )}
        <ConversationAvatar conversation={conversation} size="md" />
        <div className="min-w-0">
          <h2 className="truncate text-sm font-bold tracking-tight text-foreground">
            {conversationTitle(conversation)}
          </h2>
          <p className="truncate text-xs text-subtle">{subtitle}</p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {!connected && (
          <span
            role="status"
            className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-700 dark:text-amber-400"
          >
            <span className="size-1.5 animate-pulse rounded-full bg-amber-500" aria-hidden />
            Reconnecting…
          </span>
        )}
        {conversation.type === "group" && (
          <button
            type="button"
            onClick={onOpenDetails}
            title="Group details"
            aria-label="Group details"
            className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
          >
            <Users className="size-4" />
          </button>
        )}
      </div>
    </header>
  );
}
