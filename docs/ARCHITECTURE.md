# Architecture

## Application structure

Next.js App Router, feature-oriented, client-heavy by necessity (all data comes
from an external API in the browser):

```
src/
  app/               # routes: landing (/), login, chat — thin pages composing feature components
  components/
    ui/              # shadcn/ui primitives
    auth/            # login form UI
    chat/            # chat screen UI (conversation list, message list, composer, group dialogs)
    landing/         # Part 2 landing page sections
  features/
    auth/            # token storage, login mutation, session restore
    conversations/   # query keys, list/creation/group-management hooks
    messages/        # history query, pagination, send mutation
    users/           # user search hook
  lib/
    api/             # apiClient (fetch wrapper, ApiError, token injection)
    socket/          # socket singleton factory + event wiring
    utils/           # generic helpers
  hooks/             # cross-cutting UI hooks (e.g. auto-scroll)
  providers/         # QueryProvider (app-wide)
  types/             # verified API types
```

Pages stay thin; feature hooks own data concerns; components own presentation.

## API client boundary

`src/lib/api/client.ts` is the only place that touches `fetch`. It attaches the
JWT, JSON-encodes bodies, parses the error envelope into a typed `ApiError`,
and normalizes network failures. Feature hooks call `apiClient` with typed
generics; components never see fetch/axios details. If the API ever gains a
proxy or changes base URL, only `lib/env.ts` + `lib/api` change.

## TanStack Query (server state)

- Queries: conversations list, message history (per conversation, keyed by id +
  cursor), user search (debounced from input).
- Mutations: login, start conversation, create group, add/remove participants,
  promote admin, rename group — each invalidates or surgically updates the
  relevant cache entries. Sending a message is not a REST mutation; it goes
  over the socket (see DECISIONS #6).
- Socket events update the same caches (see below), so REST and realtime
  converge on one source of truth. No duplicated state.

## Local React state

UI-only: composer input, selected conversation id, modal/dialog visibility,
scroll position. The JWT token lives in a small
auth module (localStorage + in-memory), not in React context, since Query
and the socket need it outside the component tree.

## Socket.io role

One client socket per authenticated session, created lazily after login,
connected to `NEXT_PUBLIC_SOCKET_URL` with `auth: { token }`, disconnected on
logout. Incoming events map to cache operations:

- `message:new` → append to that conversation's first history page; update the
  conversation list's `lastMessage`/`updatedAt` (or `invalidateQueries` as fallback).
- `conversation:updated` → invalidate the conversations list (group details changed).
- Outgoing messages are sent over the socket (`message:send`) with a socket
  acknowledgement; there is no REST `POST /messages` fallback. The REST reply
  is ignored for sending (its body can be `null` with 200). Delivery
  confirmation comes from the realtime channel.

## Authentication flow

1. `POST /auth/login` (phone + name) → `{ token, user }`.
2. Token persisted client-side (localStorage, see DECISIONS #5); user cached in Query.
3. `GET /auth/me` on app load restores/validates the session; failure → login page.
4. Socket created with the token; on logout: disconnect socket, clear Query
   cache, remove token.

## Message flow

- Open conversation → query first page (latest `limit` messages, rendered
  oldest→newest).
- Send → `message:send` over the socket with a socket acknowledgement (no REST
  fallback). Sends use a pessimistic pending state: append locally, mark
  delivered on `{ ok: true }`, surface error/retry on failure ack or timeout —
  because the ack carries no message id, full optimistic reconciliation is not
  safe (see DECISIONS #6).
- Receive → `message:new` appended if the conversation is open; otherwise update
  the sidebar preview/unread indicator.

## Conversation flow

- Sidebar list from `GET /conversations` (direct + group discriminated by `type`).
- New direct chat: search users → `POST /conversations` → invalidate list.
- Groups: create with participants; admins manage members/name — all invalidate
  the list and rely on `conversation:updated` for cross-client freshness.

## Error handling strategy

- `ApiError` carries status + API error code + `details`.
- Global: QueryClient default `retry: 1` (Render cold starts make quick retries
  useful; more would hang UIs), `refetchOnWindowFocus: false`.
- Per-screen: loading skeletons, empty states, and inline retry UIs; 401s in the
  auth feature trigger logout/redirect (exact 401 shape still to be verified —
  see docs/API.md).

## Message pagination strategy

Cursor-based "load older": `GET /conversations/{id}/messages?limit=&before=`
using the oldest loaded message's `_id` as the `before` cursor (semantics to be
verified during implementation), gated by `hasMore`. Pages are stored as
infinite-query pages, newest page first, so appending realtime messages doesn't
disturb history pages.

## Auto-scroll strategy

Track scroll position in the message list container:

- On open and on send: scroll to bottom (optionally smooth).
- On `message:new` while pinned near bottom: follow to bottom.
- If the user has scrolled up (beyond a threshold from bottom): do not
  force-scroll; show a "jump to latest" affordance instead.
- After loading an older page: preserve the user's visual position
  (anchor-based scroll restoration).

## Deployment assumptions

- Static-friendly Next.js app deployed to Vercel (no server-side data routes).
- Env vars `NEXT_PUBLIC_API_BASE_URL` and `NEXT_PUBLIC_SOCKET_URL` set in the host.
- The external API is public and CORS-open; no secrets ship to the client beyond
  the per-user JWT issued at login.
