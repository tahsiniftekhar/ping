# Chat API — Verified Contract

REST base: `https://frontend-task-chatapp.onrender.com/api`
Socket.io: `https://frontend-task-chatapp.onrender.com` (host root, `/socket.io/`)

"**Verified**" = observed against the live API with real requests (recon, 2026-08-21).
"**Unverified**" = stated in the Swagger description or inferred, but not observed.

> The self-hosted backend in `server/` implements this contract with the server-side
> bugs fixed: phone search works (including a leading `+`), malformed ids return 400
> `VALIDATION_ERROR` instead of 500, unknown conversations return 404 instead of
> `200 null`, auth errors use 401 (`NO_TOKEN` / `INVALID_TOKEN`), and
> `conversation:updated` fires only after successful mutations.

## Authentication

- **Verified.** `POST /auth/login` returns `{ token, user }`; token is a JWT
  (HS256, `sub`/`iat`/`exp` claims). Protected routes require
  `Authorization: Bearer <token>`. The Socket.io handshake authenticates with
  `auth: { token }` (rejection behavior verified — see Socket.io section).
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
7. **User search by phone is effectively broken server-side** (verified
   2026-08-21): phones are stored with a leading `+`, but any query containing
   `+` (or other regex metacharacters) crashes the API's regex —
   500 with `{"error":{"message":"Regular expression is invalid: …","code":51091}}`
   (a numeric Mongo error code, not the usual envelope). Queries without `+`
   return no matches (not even substring matches). Practical effect: only
   name search works reliably; the frontend must not assume phone search
   functions.
8. **Error status codes observed**: 400 `NO_TOKEN`, 400 `VALIDATION_ERROR` (with
   `details: [{ path, message }]`), 404 `NOT_FOUND`, 500 `SERVER_ERROR` (malformed
   ObjectId; message leaks a Mongo cast error). Admin-permission errors and
   401-on-expired-token responses not yet observed.

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

## Socket.io — verified contract (live probe, 2026-08-21)

Connection:
- `io(SOCKET_URL /* host root */, { auth: { token } })` connects successfully.
  Handshake starts on **polling**, then upgrades to websocket (Engine.IO v4).
- Invalid token → `connect_error` `"Invalid token"` (`err.data` is `null`).

`message:send` (client → server) — `{ conversationId, text }`:
- Acknowledgement **is** sent when a callback is provided.
- Success ack: `{ ok: true }` — **no message object, no id**.
- Failure ack (e.g. unknown conversation): `{ ok: false, error: "Conversation not found" }`.

`message:new` (server → client) — exact observed payload:
```json
{ "id": "<ObjectId>", "conversation": "<ObjectId>", "sender": "<userId>", "text": "...", "createdAt": 1787338932458 }
```
- Uses **`id`, not `_id`**, and `createdAt` is an **epoch-millis number** (REST
  history returns `_id` and ISO strings for the same message). Normalize when
  merging with REST data.
- **The sender does NOT receive `message:new` for their own messages** (verified
  in both direct and group chats); only other participants receive it.
- The payload **is the persisted message**: `id` matches the `_id` returned by
  `GET /conversations/{id}/messages`, and `createdAt` (÷1000) matches the REST
  ISO timestamp.
- Fires for messages sent via REST `POST /messages` too (verified).

`conversation:updated` (server → client):
- Payload is the **full group conversation object** (same shape as group items
  from `GET /conversations`, but without `lastMessage`): `{ _id, type: "group",
  name, createdBy, admins, participants: User[] }`.
- Fires on group creation, rename, participant add/remove, leave, and promote
  (all verified), delivered to **all participants with a connected socket** —
  observed arriving even before the REST response.
- **Quirk (verified): a REMOVED participant still receives the
  `conversation:updated` event for their own removal.** Clients must refetch
  rather than assume the event implies membership — the removed user's
  `GET /conversations` no longer includes the group.
- **Quirk (verified): the event can also fire after a FAILED mutation** — a 400
  `UNKNOWN_USER` add still emitted `conversation:updated`. Harmless if the
  event only triggers a list refetch.
- Does **not** fire for direct-conversation creation or for new messages
  (verified — neither event occurred during direct-chat probes).

Disconnection: client `close()` → `disconnect` reason `io client disconnect`; no
unexpected server-side disconnects observed during the probe.

## Group management — verified contract (live probe, 2026-08-21/22)

All four endpoints return the **full updated group object** (same shape as
group items from `GET /conversations`, plus `createdAt`/`updatedAt`) on success,
and all emit `conversation:updated` to every connected participant (including
the removed user; see quirks above).

| Endpoint | Success | Failure behavior |
|---|---|---|
| `PATCH /conversations/{id}` (rename, admin only) | 200 + group object | 403 `FORBIDDEN` "Only admins can rename the group" for non-admins; name persists in `GET /conversations` |
| `POST /conversations/{id}/participants` (admin only) | 200 + group object | 403 `FORBIDDEN` "Only admins can add participants"; 400 `UNKNOWN_USER` "One or more users do not exist" for unknown ids |
| `DELETE /conversations/{id}/participants/{userId}` (admin; own id = leave) | 200 + group object | 403 `FORBIDDEN` "Only admins can remove other members" for non-admins removing others |
| `POST /conversations/{id}/admins` (admin only) | 200 + group object with updated `admins` | 403 `FORBIDDEN` "Only admins can promote members" |

Removal/leave behavior (verified):
- A removed user's socket stops receiving `message:new`; sending afterwards
  fails the ack with `{ ok: false, error: "Not a participant of this conversation" }`.
- The group disappears from the removed/leaving user's `GET /conversations`.
- A newly added participant receives both `conversation:updated` (for their add)
  and subsequent `message:new` events immediately (verified with a connected
  socket that joined before being added).

Idempotency quirks (verified):
- Adding an **already-added** participant → 200 + group object (no error).
- Promoting an **existing admin** → 200 + group object (no error).
- Both still emit `conversation:updated`.

## Additional verified REST behavior (probe, 2026-08-21)

- `POST /conversations` (fresh pair) → 200 `{ _id, participants: [userId, userId], createdAt }`.
- `POST /conversations/group` (3 members) → **201** with the full group object
  (same shape as `GET /conversations` group items, plus `createdAt`/`updatedAt`).
- `PATCH /conversations/{id}` (rename) → 200 with the full updated group object.
- `POST /messages` on a **valid** conversation → 200 with the full message
  object `{ _id, conversation, sender, text, createdAt(ISO) }`. The earlier
  200-with-`null` occurred on a nonexistent conversation id.
- Group validation: `participantIds` must yield ≥3 members total, else
  400 `VALIDATION_ERROR` ("a group needs at least 3 members").
- Unknown conversation id (well-formed) → 404 `NOT_FOUND` "Conversation not found".
- Malformed ObjectId in a path → **500 `SERVER_ERROR`** leaking a Mongo cast
  error string. Handle 5xx generically; don't parse the message.

## Unverified behavior (do not rely on without testing)

- Whether `POST /conversations` is idempotent for an existing pair.
- JWT expiry duration (observed `iat`/`exp` imply ~7 days, not confirmed).
- `lastMessage` shape for groups; ordering guarantees of `GET /conversations`;
  the `before` cursor semantics (id vs timestamp).
- Whether a 401 (expired/invalid but well-formed) token returns 401 or 400.
- Whether a group can drop below 3 members via removals (observed: removal down
  to 2 members succeeded; a 1-member floor, if any, was not tested).
