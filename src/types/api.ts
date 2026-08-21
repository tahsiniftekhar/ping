/**
 * Types for the external chat API.
 *
 * IMPORTANT: only shapes verified against the live API are modeled here.
 * See docs/API.md for the verification status of each shape. Do not add
 * speculative fields — extend types only after verifying live responses.
 */

/** Verified: user object as returned by login, /auth/me, search, and participant lists. */
export interface User {
  _id: string;
  name: string;
  phone: string;
  /** Present in login/me responses; absent in search results and participant lists. */
  createdAt?: string;
}

/** Verified: POST /auth/login response. */
export interface LoginResponse {
  token: string;
  user: User;
}

/** Verified: message object from GET /conversations/{id}/messages. */
export interface Message {
  _id: string;
  conversation: string;
  sender: string;
  text: string;
  createdAt: string;
}

/** Verified: GET /conversations/{id}/messages response. */
export interface MessageHistoryResponse {
  messages: Message[];
  hasMore: boolean;
}

/** Verified: lastMessage inside conversation list items; `{}` when there are no messages. */
export interface LastMessage {
  text?: string;
  sender?: string;
  createdAt?: string;
}

/**
 * Verified: direct conversation item from GET /conversations.
 * Uses singular `participant` for the other user. `lastMessage` is `{}` when empty.
 */
export interface DirectConversation {
  _id: string;
  type: "direct";
  lastMessage: LastMessage;
  updatedAt: string;
  participant: User;
}

/**
 * Verified: group conversation item from GET /conversations.
 * Uses plural `participants`; also carries `name`, `createdBy`, `admins`.
 * `lastMessage` may be `{}` (shape not yet observed for groups with messages).
 */
export interface GroupConversation {
  _id: string;
  type: "group";
  name: string;
  createdBy: string;
  admins: string[];
  participants: User[];
  lastMessage: LastMessage;
  updatedAt: string;
}

export type Conversation = DirectConversation | GroupConversation;

/** Verified: GET /conversations response. */
export interface ConversationListResponse {
  data: Conversation[];
}
