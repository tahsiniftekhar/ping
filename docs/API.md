# Chat API — Verified Contract

REST base: `https://frontend-task-chatapp.onrender.com/api`
Socket.io: `https://frontend-task-chatapp.onrender.com` (host root, `/socket.io/`)

"**Verified**" = observed against the live API with real requests (recon, 2026-08-21).
"**Unverified**" = stated in the Swagger description or inferred, but not observed.

## Authentication

- **Verified.** `POST /auth/login` returns `{ token, user }`; token is a JWT
  (HS256, `sub`/`iat`/`exp` claims). Protected routes require
  `Authorization: Bearer <token>`. The Socket.io handshake authenticates with
  `auth: { token }` (documented; handshake rejection behavior not observed).
- Login doubles as registration: new phone numbers create accounts automatically.

## Endpoints — verified request behavior

| Method & path | Body / params | Notes |
|---|---|---|
| `POST /auth/login` | `{ phone: string, name: string }` | both required |
| `GET /auth/me` | — | |
| `GET /users/search` | `?q=` (required) | name or phone |
| `GET /conversations` | — | direct + group |
| `POST /conversations` | `{ userId }` | start/open a direct chat |
| `GET /conversations/{id}/messages` | `?limit=&before=` | cursor pagination |
| `POST /messages` | `{ conversationId, text }` | direct or group |
| `POST /conversations/group` | `{ name, participantIds: string[] }` | creator becomes admin |
| `POST /conversations/{id}/participants` | `{ userIds: string[] }` | admin only |
| `DELETE /conversations/{id}/participants/{userId}` | — | own id = leave |
| `POST /conversations/{id}/admins` | `{ userId }` | admin only |
| `PATCH /conversations/{id}` | `{ name }` | rename, admin only |
| `GET /health` | — | at host **root**, not `/api/health` |

## Verified response behavior

- `POST /auth/login` → `{ token: string, user: { _id, name, phone, createdAt } }`
- `GET /auth/me` → `{ _id, name, phone, createdAt }` (bare user object)
- `GET /users/search` → **bare array** of `{ _id, name, phone }`
- `GET /conversations` → `{ data: [...] }`
  - direct item: `{ _id, type: "direct", lastMessage, updatedAt, participant: User }`
  - group item: `{ _id, type: "group", name, createdBy, admins: string[], participants: User[], lastMessage, updatedAt }`
- `GET /conversations/{id}/messages` → `{ messages: [...], hasMore: boolean }`
  - message: `{ _id, conversation, sender, text, createdAt }`
- Error envelope (all observed errors): `{ error: { message, code, details? } }`

`lastMessage` when a conversation has no messages is `{}` — an empty object, not
`null` or omitted. For a direct conversation with messages it was observed as
`{ text, sender, createdAt }` (no message id).

## Observed quirks

1. **Inconsistent envelopes**: bare array (search), `{ data }` (conversations),
   `{ messages, hasMore }` (history). Parse per-endpoint.
2. **`POST /messages` can return HTTP 200 with body `null`** — observed when
   posting to a nonexistent conversation id. Treat the REST response as
   unreliable; treat the realtime channel (`message:new`) as the source of
   truth for delivery.
3. **`/health` documented under `/api` but served at the host root.**
4. **Direct vs group conversation items have different shapes** — discriminate on
   `type`; direct uses singular `participant`, group uses `participants`.
5. **IDs are MongoDB ObjectID strings** (24 hex chars). Timestamps are ISO-8601 UTC strings.
6. **Render free tier behind Cloudflare**: cold starts can take tens of seconds;
   first request after idle may be slow. Design loading states accordingly.
7. **Error status codes observed**: 400 `NO_TOKEN`, 400 `VALIDATION_ERROR` (with
   `details: [{ path, message }]`), 404 `NOT_FOUND`. Admin-permission errors and
   401-on-bad-token responses not yet observed.

## Pagination

- Only message history is paginated: `limit` (integer, default observed: full list)
  and `before` (cursor). `hasMore` flags whether older messages exist
  (verified: `limit=1` on a 1-message conversation flips `hasMore` correctly).
  The exact semantics of `before` (message id vs timestamp) **unverified**.
- `GET /conversations` and `GET /users/search` appear unpaginated.

## CORS / runtime

- **Verified**: preflight returns `Access-Control-Allow-Origin: *`, methods
  `GET,HEAD,PUT,PATCH,POST,DELETE`, and reflects requested headers (incl.
  `authorization`). Direct browser calls work; no proxy needed.
- Socket.io must connect to the host root (`io(socketUrl, { auth: { token } })`),
  not to the `/api` base.

## Unverified behavior (do not rely on without testing)

- Response bodies/status codes for: `POST /conversations`, `POST /conversations/group`,
  participant/admin/rename endpoints, successful `POST /messages`.
- Socket event payload shapes (`message:new`, `conversation:updated`) and the
  `message:send` ack callback signature.
- Whether `POST /conversations` is idempotent for an existing pair.
- JWT expiry duration (observed `iat`/`exp` imply ~7 days, not confirmed).
- `lastMessage` shape for groups; ordering guarantees of `GET /conversations`.
