"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  createContext,
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

interface SocketContextValue {
  socket: Socket | null;
  connected: boolean;
}

const SocketContext = createContext<SocketContextValue>({ socket: null, connected: false });

export function useSocket(): SocketContextValue {
  return useContext(SocketContext);
}

export function SocketProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  // One socket per authenticated session; connect on auth, disconnect on
  // logout or provider unmount. The login page never mounts an authed session,
  // so it never connects. The setState calls below are event-callback
  // registrations (they run on socket events, not during the effect).
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!isAuthenticated) return;

    const chatSocket = createChatSocket();
    setSocket(chatSocket);

    chatSocket.on("connect", () => setConnected(true));
    chatSocket.on("disconnect", () => setConnected(false));
    chatSocket.on("message:new", (message: SocketMessageNew) => {
      insertIntoHistory(queryClient, message.conversation, message);
      // Conversation list previews/order come from the server; never fabricated.
      void queryClient.invalidateQueries({ queryKey: conversationKeys.all });
    });
    chatSocket.on("conversation:updated", () => {
      void queryClient.invalidateQueries({ queryKey: conversationKeys.all });
    });

    return () => {
      setConnected(false);
      setSocket(null);
      chatSocket.removeAllListeners();
      chatSocket.disconnect();
    };
  }, [isAuthenticated, queryClient]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const value = useMemo(() => ({ socket, connected }), [socket, connected]);

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}
