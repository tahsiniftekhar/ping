"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSocket } from "@/providers/socket-provider";
import type { MessageSendAck } from "@/lib/socket/types";
import { postMessage } from "@/features/messages/api";
import { insertMessages } from "@/features/messages/cache";
import { messageKeys } from "@/features/messages/queries";
import { conversationKeys } from "@/features/conversations/queries";
import type { Message } from "@/types/api";

/**
 * A local message used for pending/sent/failed rendering. `clientId` doubles
 * as the `clientMessageId` idempotency key on delivery-capable servers
 * (docs/delivery.md); the hosted API never sees it.
 */
export interface PendingMessage {
  clientId: string;
  conversationId: string;
  sender: string;
  text: string;
  createdAt: number;
  status: "pending" | "sent" | "failed";
  error?: string;
}

const ACK_TIMEOUT_MS = 10_000;

function newClientId(): string {
  return crypto.randomUUID();
}

/** The server answered and said no; resending the same payload won't help. */
class SendRejected extends Error {}

export function useSendMessage(conversationId: string, senderId: string) {
  const { socket, connected, delivery } = useSocket();
  const queryClient = useQueryClient();
  const [pendingMessages, setPendingMessages] = useState<PendingMessage[]>([]);
  // guards setState after unmount / conversation switch
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const emitWithAck = useCallback(
    (text: string, clientMessageId?: string) =>
      new Promise<Message | null>((resolve, reject) => {
        if (!socket) {
          reject(new Error("Not connected"));
          return;
        }
        let settled = false;
        const finish = (fn: () => void) => {
          if (settled) return;
          settled = true;
          socket.off("disconnect", onDisconnect);
          clearTimeout(timeout);
          fn();
        };
        const onDisconnect = () => finish(() => reject(new Error("Disconnected during send")));
        const timeout = setTimeout(
          () => finish(() => reject(new Error("Send timed out"))),
          ACK_TIMEOUT_MS,
        );

        socket.on("disconnect", onDisconnect);
        socket.emit(
          "message:send",
          { conversationId, text, ...(clientMessageId && { clientMessageId }) },
          (ack?: MessageSendAck) => {
            if (ack && ack.ok) return finish(() => resolve(ack.message ?? null));
            finish(() => reject(new SendRejected(ack && "error" in ack ? ack.error : "Send failed")));
          },
        );
      }),
    [socket, conversationId],
  );

  /**
   * Socket when live, REST when the socket is down, so sending never blocks on
   * the realtime link. With idempotent sends a lost ack also falls back to REST
   * under the same key — the server returns the stored message instead of a
   * duplicate. Legacy servers get no automatic resend for exactly that reason.
   */
  const deliver = useCallback(
    async (text: string, clientId: string): Promise<Message | null> => {
      const key = delivery ? clientId : undefined;
      if (socket && connected) {
        try {
          return await emitWithAck(text, key);
        } catch (cause) {
          if (!key || cause instanceof SendRejected) throw cause;
        }
      }
      const saved = await postMessage(conversationId, text, key);
      if (!saved) throw new Error("The server did not accept this message");
      return saved;
    },
    [socket, connected, delivery, conversationId, emitWithAck],
  );

  const attempt = useCallback(
    async (message: PendingMessage) => {
      try {
        const stored = await deliver(message.text, message.clientId);
        // The sender never receives its own `message:new`; refresh the sidebar preview.
        void queryClient.invalidateQueries({ queryKey: conversationKeys.all });
        if (stored) {
          // Delivery-capable server: the ack carries the stored message, so no refetch is needed.
          insertMessages(queryClient, conversationId, [stored]);
          if (alive.current) {
            setPendingMessages((previous) => previous.filter((item) => item.clientId !== message.clientId));
          }
          return;
        }
        if (alive.current) {
          setPendingMessages((previous) =>
            previous.map((item) => (item.clientId === message.clientId ? { ...item, status: "sent" } : item)),
          );
        }
        // Legacy ack has no message; the refetched history replaces the local copy.
        void queryClient.invalidateQueries({ queryKey: messageKeys.history(conversationId) });
      } catch (cause) {
        if (alive.current) {
          setPendingMessages((previous) =>
            previous.map((item) =>
              item.clientId === message.clientId
                ? { ...item, status: "failed", error: cause instanceof Error ? cause.message : "Send failed" }
                : item,
            ),
          );
        }
      }
    },
    [deliver, queryClient, conversationId],
  );

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (trimmed.length === 0) return;

      const message: PendingMessage = {
        clientId: newClientId(),
        conversationId,
        sender: senderId,
        text: trimmed,
        createdAt: Date.now(),
        status: "pending",
      };
      setPendingMessages((previous) => [...previous, message]);
      await attempt(message);
    },
    [conversationId, senderId, attempt],
  );

  /** Retries keep the same `clientId`, so a send that actually landed is not stored twice. */
  const retry = useCallback(
    async (failed: PendingMessage) => {
      const again: PendingMessage = { ...failed, status: "pending", error: undefined };
      setPendingMessages((previous) => previous.map((item) => (item.clientId === failed.clientId ? again : item)));
      await attempt(again);
    },
    [attempt],
  );
  const dismiss = useCallback((clientId: string) => {
    setPendingMessages((previous) => previous.filter((item) => item.clientId !== clientId));
  }, []);

  return {
    pendingMessages: pendingMessages.filter((item) => item.conversationId === conversationId),
    hasPending: pendingMessages.some((item) => item.conversationId === conversationId && item.status === "pending"),
    connected,
    send,
    retry,
    dismiss,
  };
}
