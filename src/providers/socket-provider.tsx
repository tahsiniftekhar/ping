"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Socket } from "socket.io-client";
import { conversationKeys } from "@/features/conversations/queries";
import { messageKeys } from "@/features/messages/queries";
import { createChatSocket } from "@/lib/socket/client";
import { collectSyncCursors, fromSocketMessage, insertMessages, latestSeq } from "@/features/messages/cache";
import {
  DELIVERY_FEATURES,
  type ServerHello,
  type SocketMessageNew,
  type SyncAck,
  type SyncCursor,
} from "@/lib/socket/types";
import { useAuth } from "@/providers/auth-provider";

export type ConnectionStatus = "connecting" | "connected" | "reconnecting" | "offline";

interface SocketContextValue {
  socket: Socket | null;
  connected: boolean;
  status: ConnectionStatus;
  /** Forces an immediate reconnect attempt (e.g. from a "Retry" control). */
  reconnect: () => void;
  /**
   * The server announced the delivery protocol (docs/delivery.md): idempotent
   * sends, per-conversation `seq` and replay. False for the hosted API.
   */
  delivery: boolean;
}

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  connected: false,
  status: "connecting",
  reconnect: () => {},
  delivery: false,
});

export function useSocket(): SocketContextValue {
  return useContext(SocketContext);
}

const MANUAL_RETRY_BASE_MS = 2_000;
const MANUAL_RETRY_MAX_MS = 30_000;
const SYNC_TIMEOUT_MS = 10_000;

export function SocketProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, logout } = useAuth();
  const queryClient = useQueryClient();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [delivery, setDelivery] = useState(false);

  // One socket per authenticated session; connect on auth, disconnect on
  // logout or provider unmount. The setState calls below run from socket and
  // window event callbacks, not synchronously in the effect body.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!isAuthenticated) return;

    const chatSocket = createChatSocket();
    setSocket(chatSocket);
    setStatus(navigator.onLine ? "connecting" : "offline");

    let hasConnectedBefore = false;
    let supportsDelivery = false;
    let manualRetryTimer: ReturnType<typeof setTimeout> | undefined;
    let manualAttempts = 0;

    const connectNow = () => {
      clearTimeout(manualRetryTimer);
      if (!chatSocket.connected) chatSocket.connect();
    };

    const refetchHistories = (conversationIds?: string[]) => {
      if (!conversationIds) {
        void queryClient.invalidateQueries({ queryKey: messageKeys.all });
        return;
      }
      for (const id of conversationIds) {
        void queryClient.invalidateQueries({ queryKey: messageKeys.history(id) });
      }
    };

    /** Asks the server for everything after our cursors; refetches whatever it can't resume. */
    const replay = (cursors: SyncCursor[]) => {
      if (cursors.length === 0) return;
      chatSocket
        .timeout(SYNC_TIMEOUT_MS)
        .emit("messages:sync", { cursors }, (error: Error | null, ack?: SyncAck) => {
          if (error || !ack?.ok) {
            refetchHistories(cursors.map((cursor) => cursor.conversationId));
            return;
          }
          for (const result of ack.results) {
            insertMessages(queryClient, result.conversationId, result.messages);
            if (!result.complete) refetchHistories([result.conversationId]);
          }
        });
    };

    chatSocket.on("connect", () => {
      manualAttempts = 0;
      setStatus("connected");
      if (hasConnectedBefore) {
        // Previews and order come from the server; one list request covers missed activity.
        void queryClient.invalidateQueries({ queryKey: conversationKeys.all });
        // Legacy servers don't replay missed events, so fall back to refetching every history.
        // Delivery-capable servers replay from `server:hello` below instead.
        if (!supportsDelivery) refetchHistories();
      }
      hasConnectedBefore = true;
    });

    chatSocket.on("server:hello", (hello: ServerHello) => {
      supportsDelivery = DELIVERY_FEATURES.every((feature) => hello.features?.includes(feature));
      setDelivery(supportsDelivery);
      if (!supportsDelivery) return;
      // Covers both reconnects and anything sent between the first history fetch and connect.
      const { cursors, unresumable } = collectSyncCursors(queryClient);
      refetchHistories(unresumable);
      replay(cursors);
    });

    chatSocket.on("disconnect", (reason) => {
      setStatus(navigator.onLine ? "reconnecting" : "offline");
      // A server-side disconnect is not retried by socket.io automatically.
      if (reason === "io server disconnect") connectNow();
    });

    chatSocket.on("connect_error", (error) => {
      if (error.message === "Invalid token") {
        // Expired/revoked JWT: REST would fail too, so end the session cleanly.
        logout();
        return;
      }
      setStatus(!navigator.onLine ? "offline" : hasConnectedBefore ? "reconnecting" : "connecting");
      // Errors raised by server middleware disable socket.io's own reconnection
      // (`active` becomes false); schedule our own capped backoff instead.
      if (!chatSocket.active) {
        const delay = Math.min(MANUAL_RETRY_BASE_MS * 2 ** manualAttempts, MANUAL_RETRY_MAX_MS);
        manualAttempts += 1;
        clearTimeout(manualRetryTimer);
        manualRetryTimer = setTimeout(connectNow, delay);
      }
    });

    chatSocket.on("message:new", (message: SocketMessageNew) => {
      const seen = latestSeq(queryClient, message.conversation);
      insertMessages(queryClient, message.conversation, [fromSocketMessage(message)]);
      // A jump in `seq` means events were missed (e.g. a brief drop); fetch just the gap.
      if (supportsDelivery && seen !== undefined && message.seq !== undefined && message.seq > seen + 1) {
        replay([{ conversationId: message.conversation, afterSeq: seen }]);
      }
      // Conversation list previews/order come from the server; never fabricated.
      void queryClient.invalidateQueries({ queryKey: conversationKeys.all });
    });
    chatSocket.on("conversation:updated", () => {
      void queryClient.invalidateQueries({ queryKey: conversationKeys.all });
    });

    const onOnline = () => {
      setStatus("reconnecting");
      connectNow();
    };
    const onOffline = () => setStatus("offline");
    // Background tabs get throttled timers; check the link as soon as the user is back.
    const onVisible = () => {
      if (document.visibilityState === "visible" && !chatSocket.connected) connectNow();
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearTimeout(manualRetryTimer);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      document.removeEventListener("visibilitychange", onVisible);
      setStatus("connecting");
      setDelivery(false);
      setSocket(null);
      chatSocket.removeAllListeners();
      chatSocket.disconnect();
    };
  }, [isAuthenticated, queryClient, logout]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const reconnect = useCallback(() => {
    if (socket && !socket.connected) socket.connect();
  }, [socket]);

  const value = useMemo(
    () => ({ socket, connected: status === "connected", status, reconnect, delivery }),
    [socket, status, reconnect, delivery],
  );

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}
