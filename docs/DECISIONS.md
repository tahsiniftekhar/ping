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

## 6. Socket.io `message:send` as the primary messaging mechanism — 2026-08-22

**Decision:** Socket.io `message:send` will be the primary realtime messaging
mechanism, with REST `POST /messages` as fallback. **Optimistic reconciliation
is not decided yet** — it will be decided after the `message:new` payload and
the acknowledgement behavior are verified against the live socket.

**Rationale:** Observed 200-with-`null` responses from `POST /messages` make the
REST reply useless as a delivery signal, so the socket is the natural primary
channel. Whether we can reconcile optimistic entries safely (dedupe keys, ack
semantics, rollback behavior) depends on payload shapes that are still unverified.

**Trade-off:** Deferring the optimistic-update decision means the first
implementation may use a simpler pessimistic flow (pending state until
`message:new`/ack) and be refined once realtime behavior is verified. Two send
paths (socket + REST fallback) still need to stay consistent either way.
