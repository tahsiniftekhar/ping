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
import type { SocketMessageNew } from "@/lib/socket/types";
import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import type { MessageHistoryResponse } from "@/types/api";
import { useAuth } from "@/providers/auth-provider";

/**
 * Normalizes a socket message into the REST message shape (the presentation
 * model): `id` → `_id`, epoch millis → ISO string. This is the only place the
 * two timestamp/id forms are bridged for the cache.
 */
function toRestShape(message: SocketMessageNew) {
  return {
    _id: message.id,
    conversation: message.conversation,
    sender: message.sender,
    text: message.text,
    createdAt: new Date(message.createdAt).toISOString(),
  };
}

/**
 * Inserts a realtime message into a conversation's first history page.
 * Pages are newest-first (`messages[0]` is the newest), so the new message is
 * unshifted onto page 0. Pagination metadata (`pageParam` cursors, `hasMore`)
 * is untouched. Duplicate ids are ignored. The updater form of setQueryData
 * reads the latest cache value atomically, so a concurrent refetch cannot be
 * clobbered by a stale read-then-write.
 */
function insertIntoHistory(
  queryClient: QueryClient,
  conversationId: string,
  socketMessage: SocketMessageNew,
) {
  queryClient.setQueryData<InfiniteData<MessageHistoryResponse> | undefined>(
    messageKeys.history(conversationId),
    (existing) => {
      if (!existing) return undefined; // history never loaded; refetch covers it

      const alreadyPresent = existing.pages.some((page) =>
        page.messages.some((message) => message._id === socketMessage.id),
      );
      if (alreadyPresent) return existing;

      return {
        ...existing,
        pages: existing.pages.map((page, index) =>
          index === 0
            ? { ...page, messages: [toRestShape(socketMessage), ...page.messages] }
            : page,
        ),
      };
    },
  );
}

export type ConnectionStatus = "connecting" | "connected" | "reconnecting" | "offline";

interface SocketContextValue {
  socket: Socket | null;
  connected: boolean;
  status: ConnectionStatus;
  /** Forces an immediate reconnect attempt (e.g. from a "Retry" control). */
  reconnect: () => void;
}

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  connected: false,
  status: "connecting",
  reconnect: () => {},
});

export function useSocket(): SocketContextValue {
  return useContext(SocketContext);
}

const MANUAL_RETRY_BASE_MS = 2_000;
const MANUAL_RETRY_MAX_MS = 30_000;

export function SocketProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, logout } = useAuth();
  const queryClient = useQueryClient();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");

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
    let manualRetryTimer: ReturnType<typeof setTimeout> | undefined;
    let manualAttempts = 0;

    const connectNow = () => {
      clearTimeout(manualRetryTimer);
      if (!chatSocket.connected) chatSocket.connect();
    };

    chatSocket.on("connect", () => {
      manualAttempts = 0;
      setStatus("connected");
      // The server does not replay events missed while offline; resync from REST.
      if (hasConnectedBefore) {
        void queryClient.invalidateQueries({ queryKey: conversationKeys.all });
        void queryClient.invalidateQueries({ queryKey: messageKeys.all });
      }
      hasConnectedBefore = true;
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
      insertIntoHistory(queryClient, message.conversation, message);
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
    () => ({ socket, connected: status === "connected", status, reconnect }),
    [socket, status, reconnect],
  );

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}
