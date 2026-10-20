"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSocket } from "@/providers/socket-provider";
import type { MessageSendAck } from "@/lib/socket/types";
import { postMessage } from "@/features/messages/api";

/**
 * A local, client-only message used for pending/sent/failed rendering.
 * `clientId` is purely local — never sent to the server, never treated as a
 * server message id. After a history refetch the server data replaces these.
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
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function useSendMessage(conversationId: string, senderId: string) {
  const { socket, connected } = useSocket();
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
    (text: string) =>
      new Promise<void>((resolve, reject) => {
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
        socket.emit("message:send", { conversationId, text }, (ack?: MessageSendAck) => {
            if (ack && ack.ok) return finish(resolve);
            finish(() => reject(new Error(ack && "error" in ack ? ack.error : "Send failed")));
          });
      }),
    [socket, conversationId],
  );

  /**
   * Socket when live (acked delivery); REST when the socket is down so sending
   * never blocks on the realtime link. No automatic REST retry after a socket
   * timeout — the server may have stored the message and a resend would duplicate it.
   */
  const deliver = useCallback(
    async (text: string) => {
      if (socket && connected) return emitWithAck(text);
      const saved = await postMessage(conversationId, text);
      if (!saved) throw new Error("The server did not accept this message");
    },
    [socket, connected, conversationId, emitWithAck],
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

      try {
        await deliver(trimmed);
        if (alive.current) {
          setPendingMessages((previous) =>
            previous.map((item) =>
              item.clientId === message.clientId ? { ...item, status: "sent" } : item,
            ),
          );
        }
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
    [conversationId, senderId, deliver],
  );

  /** Retry sends the same text as a brand-new local message with a new clientId. */
  const retry = useCallback(
    async (failed: PendingMessage) => {
      setPendingMessages((previous) => previous.filter((item) => item.clientId !== failed.clientId));
      await send(failed.text);
    },
    [send],
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
