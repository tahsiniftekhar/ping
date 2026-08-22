# Architecture Decisions

Short log of meaningful decisions. Format: context → decision → trade-off.
Date format YYYY-MM-DD.

## 1. TanStack Query instead of Redux for server state — 2026-08-21

**Decision:** All server data (conversations, messages, users, session) lives in
TanStack Query. No Redux or other client store.

**Rationale:** The app is almost entirely server state with cache-update
semantics (pagination, invalidation, realtime patches). Query gives caching,
retry, loading/error states, and cursor pagination out of the box; Redux would
require hand-writing all of that. Local UI state is small and stays in React.

**Trade-off:** Cross-cutting client state (e.g. complex unread counters, draft
sync across devices) would need another home — acceptable; use component state
or a tiny context if genuinely needed.

## 2. Direct browser → API communication; no Next.js API proxy — 2026-08-21

**Decision:** The browser calls `https://frontend-task-chatapp.onrender.com/api`
directly (verified CORS: `Access-Control-Allow-Origin: *`). No `/api/*` route
handlers or rewrites in Next.

**Rationale:** A proxy adds latency and deploy complexity, and buys nothing
here: the API is public, CORS-open, and auth is a per-user bearer token (no
secrets to hide server-side).

**Trade-off:** Tightly coupled to the API's CORS posture; if it ever restricted
origins we'd need a proxy or same-origin rewrite. Also rules out server-side
rendering of chat data (fine — chat is an authenticated client experience).

## 3. Socket.io client connected to the API host root — 2026-08-21

**Decision:** `io(NEXT_PUBLIC_SOCKET_URL /* host root */, { auth: { token } })`,
never the `/api` base.

**Rationale:** Socket.io serves itself at `<host>/socket.io/`; the API documents
this explicitly, and the Engine.IO endpoint was verified at the root.

**Trade-off:** Two env vars to keep in sync (REST base vs socket root). If the
host ever split REST and socket deployments, config must change — hence both are
explicit in `.env.example`.

## 4. Minimal feature-oriented structure — 2026-08-21

**Decision:** `src/{app, components/{ui,auth,chat,landing}, features/*, lib/*,
hooks, providers, types}` with feature logic in `features/`, presentation in
`components/`, and a single API client in `lib/api`. No service/repository
layers, no barrel files, no state managers beyond Query.

**Rationale:** Right-sized for a 24-hour, 3-part assignment: clear boundaries
without framework ceremony. Each part (chat, landing) maps to visible directories.

**Trade-off:** If the app grew large, `features/` would want its own slices with
co-located components; not worth it now.

## 5. JWT persisted in localStorage — 2026-08-21

**Decision:** Store the login JWT in localStorage (behind a small auth module),
restore sessions on load via `GET /auth/me`.

**Rationale:** The API uses bearer tokens, no cookies — httpOnly-session
hardening isn't available. The API is a take-home sandbox, and localStorage
survives reloads, which the UX requires.

**Trade-off:** localStorage is readable by XSS. Mitigations: no `dangerouslySetInnerHTML`,
sanitized rendering of message text (React escapes by default), token kept out
of logs. In a production setting we'd push for httpOnly cookies via a backend
proxy. Flagged as a known limitation for the write-up.

## 6. Socket.io `message:send` as the messaging mechanism — 2026-08-22 (updated after live probe)

**Decision:** Socket.io `message:send` is the send path. There is no REST
`POST /messages` fallback. The live probe (2026-08-21, see docs/API.md)
confirmed the ack is `{ ok: true }` on success and `{ ok: false, error }` on
failure — **it contains no message id**, and the sender never receives
`message:new` for their own messages.

**Consequence — no safe optimistic reconciliation key.** Because neither the ack
nor a sender-side `message:new` provides a correlation id for the sent message,
full optimistic updates (append → reconcile by id → rollback) cannot be
correlated safely. The initial implementation will therefore use a
**server-confirmed/pending approach**: append the message locally in a
*pending* state, mark it *delivered* on `{ ok: true }`, and surface an error /
retry on failure ack or timeout. Canonical message state (real ids, ISO
timestamps) comes from REST history and from `message:new` (which carries `id`
+ epoch-millis `createdAt` and must be normalized). Revisit optimistic
reconciliation only if a correlation mechanism surfaces later.

**Trade-off:** Slightly less instant "sent" feedback than a full optimistic
flow, and pending entries are lost on remount until refetched. In exchange, no
risk of duplicate or phantom messages, and a single, consistent send path that
does not depend on the REST reply (whose body can be `null` with 200).
