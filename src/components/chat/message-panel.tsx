"use client";

import { useMemo, useState } from "react";
import { GroupDetailsDialog } from "@/components/chat/group-details-dialog";
import { MessageComposer } from "@/components/chat/message-composer";
import { MessageHeader } from "@/components/chat/message-header";
import { MessageList } from "@/components/chat/message-list";
import { MessageEmptyState, MessageError, MessageSkeleton } from "@/components/chat/message-states";
import { buildTimeline, mergeMessages } from "@/features/messages/helpers";
import { chronologicMessages, useMessageHistory } from "@/features/messages/queries";
import { useSendMessage } from "@/features/messages/use-send-message";
import type { Conversation } from "@/types/api";

export function MessagePanel({
  conversation,
  currentUserId,
  onConversationLeft,
  onBack,
  unreadSince = null,
}: {
  conversation: Conversation;
  currentUserId: string;
  onConversationLeft: () => void;
  onBack?: () => void;
  /** Read mark at the moment the conversation was opened; null when nothing was unread. */
  unreadSince?: number | null;
}) {
  const { data, isPending, isError, error, refetch, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useMessageHistory(conversation._id);
  const { pendingMessages, connected, send, retry, dismiss } = useSendMessage(
    conversation._id,
    currentUserId,
  );
  const [detailsOpen, setDetailsOpen] = useState(false);

  const messages = useMemo(
    () => mergeMessages(data ? chronologicMessages(data.pages) : [], pendingMessages, currentUserId),
    [data, pendingMessages, currentUserId],
  );
  const items = useMemo(() => buildTimeline(messages, new Date(), unreadSince), [messages, unreadSince]);

  const senderNames = useMemo(() => {
    const names = new Map<string, string>();
    if (conversation.type === "group") {
      for (const participant of conversation.participants) names.set(participant._id, participant.name);
    }
    return names;
  }, [conversation]);


  return (
    <section className="flex min-h-0 flex-1 flex-col bg-surface">
      <MessageHeader
        conversation={conversation}
        currentUserId={currentUserId}
        connected={connected}
        onBack={onBack}
        onOpenDetails={() => setDetailsOpen(true)}
      />

      <div className="relative min-h-0 flex-1 bg-background/35">
        {isPending ? (
          <MessageSkeleton />
        ) : isError && !data ? (
          <MessageError error={error} onRetry={() => void refetch()} />
        ) : messages.length === 0 ? (
          <MessageEmptyState conversation={conversation} />
        ) : (
          <MessageList
            items={items}
            messages={messages}
            pageCount={data?.pages.length ?? 0}
            isGroup={conversation.type === "group"}
            senderNames={senderNames}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            fetchNextPage={() => void fetchNextPage()}
            onRetry={(message) => void retry(message)}
            onDismiss={dismiss}
          />
        )}
      </div>

      <MessageComposer
        conversationId={conversation._id}
        connected={connected}
        onSend={(text) => void send(text)}
      />

      {conversation.type === "group" && (
        <GroupDetailsDialog
          group={conversation}
          currentUserId={currentUserId}
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
          onLeft={onConversationLeft}
        />
      )}
    </section>
  );
}
