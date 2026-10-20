# Message delivery

The self-hosted backend in `server/` adds three things to the original chat contract: idempotent sends, a per-conversation sequence number (`seq`) on every message, and a replay call (`messages:sync`) for clients that missed events. Delivery stays at-least-once on the wire, but storage is deduplicated: a retried send never stores twice, order never depends on clocks, and a reconnect recovers exactly what was missed. Everything is additive. The client detects the capability at connect time and falls back to the original behaviour against the hosted API.

## The gap

Facts from `docs/API.md` (hosted API):

- The `message:send` ack is `{ ok: true }`. It carries no message and no id.
- The sender never receives `message:new` for its own message. Only the other participants do.
- So the client could only match a pending local message to the stored one heuristically: same sender, same text, within a 60 s window.
- A retry after a lost ack could store a duplicate, because the server had no way to recognise it.
- Ordering came from `createdAt` / ObjectId, which is not a guarantee under concurrent writes.
- A reconnect meant refetching every loaded history, because missed `message:new` events are not replayed.

## The fix

### Capability handshake

On every connection the server emits:

```json
{ "protocol": 2, "features": ["idempotent-send", "message-seq", "sync"] }
```

as `server:hello`. The hosted API never sends it, so the client stays in legacy mode (heuristic matching, refetch on reconnect, no automatic resend). The client enables delivery mode only when all three features are listed.

Old clients keep working against the new server: they see the original contract plus extra fields (`seq`, `clientMessageId`, `message` in the ack) that they ignore.

### Idempotent sends

`message:send` and `POST /messages` accept an optional key:

```json
{ "conversationId": "<ObjectId>", "text": "hi", "clientMessageId": "3f0c9a52-..." }
```

- `clientMessageId` is 8-64 characters, `[A-Za-z0-9_-]`. The client uses `crypto.randomUUID()`.
- The ack now carries the stored message: `{ ok: true, message }`. REST returns the same message.
- A unique partial index on `(sender, clientMessageId)` enforces the key per sender.
- A retry with the same key returns the stored message. It does not re-emit `message:new` and does not allocate a new `seq`.
- Reusing a key for a different conversation is a 400 (`clientMessageId already used`).
- Two identical sends racing: the loser hits the duplicate-key error, reads the winner's message and returns it. It has already taken a `seq`, which is burned. Gaps are allowed.

Client side:

- A retry reuses the same key (`PendingMessage.clientId`).
- With a key, a lost or timed-out socket ack falls back to REST under the same key. That is safe: the server returns the stored message instead of a second one. Legacy mode does no automatic resend, for exactly that reason.
- The stored message from the ack goes straight into the TanStack Query cache and the pending copy is removed. No refetch.
- `mergeMessages` matches pending to stored by exact `clientMessageId`. The sender + text + 60 s heuristic remains only for messages without a key (legacy servers).

Why: the ack was the only delivery signal and it was lossy and anonymous. The key makes a send a request the server can recognise, so retrying is always safe.

### Ordering

```json
{ "_id": "...", "conversation": "...", "sender": "...", "text": "...", "createdAt": "...", "seq": 42, "clientMessageId": "..." }
```

- Each conversation has a `lastSeq` counter. A send does `findOneAndUpdate({ _id, participants: sender }, { $inc: { lastSeq: 1 } })` and uses the result as the message's `seq`. The same atomic call is the participant check, so a non-participant gets "Conversation not found" and no seq is consumed.
- A unique index on `(conversation, seq)` guarantees no two messages share a position.
- History is sorted by `seq`. `before` is still a message id: the server looks it up, takes its `seq` and returns `seq < that`. A `before` from another conversation, or an unknown one, is a 400.
- Nothing orders by `createdAt` or ObjectId. The client also sorts its cache by `seq` when both sides have one.
- Gaps can exist (burned seqs from races), so `seq` means order, not count. Never infer "N messages" from `seq`.
- `message:new` includes `seq`.

Why: wall-clock time and ObjectId are not a total order across concurrent writers. A counter incremented in the database is.

### Replay

`messages:sync` lets a client ask for everything after what it has seen:

```json
// client -> server
{ "cursors": [{ "conversationId": "<ObjectId>", "afterSeq": 41 }] }

// ack
{ "ok": true, "results": [{ "conversationId": "<ObjectId>", "messages": [ /* seq ascending */ ], "complete": true }] }
// or { "ok": false, "error": "..." }
```

- At most 100 cursors per call; each result holds at most 100 messages. If more exist, `complete` is `false`.
- A conversation the user is not in (or that does not exist) returns `messages: []` and `complete: false`.
- Rate limited per socket (10 calls per 10 s); invalid payloads get `{ ok: false }`. A missing ack callback is tolerated.

Client behaviour:

- On every `server:hello` the client sends the highest `seq` it holds for each loaded history. This covers reconnects and also the window between the first history fetch and the socket connecting.
- A loaded history with no messages asks from `0`.
- Histories it cannot resume (messages without `seq`, i.e. legacy data), results with `complete: false`, and failed or timed-out syncs (10 s) fall back to a plain refetch of that conversation.
- When `message:new` arrives with `seq` greater than last seen + 1, the client runs a targeted sync for that conversation to fetch the gap.
- Replayed messages go through the same cache insert as live ones, which ignores ids it already has.
- The conversation list is still one refetch on reconnect (previews and order come from the server).

### Migration

- `npm run migrate:seq` (`migrate:seq:dev` for local) numbers legacy messages per conversation and sets `lastSeq`, then runs `syncIndexes`. It continues after any `seq` already in use.
- This is the one place `_id` order is used: legacy data has no better ordering.
- It is idempotent and safe to re-run. It needs only `MONGODB_URI`.
- `reset-demo` seeds messages with `seq` directly.

## Compatibility

| Behaviour | Hosted API (legacy) | Self-hosted (delivery) |
|---|---|---|
| `server:hello` | never sent | `{ protocol: 2, features }` |
| `message:send` ack | `{ ok: true }` | `{ ok: true, message }` |
| Duplicate protection | none | `clientMessageId` + unique index |
| Pending to stored matching | sender + text + 60 s | exact `clientMessageId` |
| Ordering | `createdAt` / ObjectId | per-conversation `seq` |
| After reconnect | refetch every loaded history | `messages:sync`, refetch only what it cannot resume |
| Retry after lost ack | manual retry, may duplicate | same key, safe, falls back to REST |
| Old clients | n/a | unchanged contract plus extra fields |

## Tests

`cd server && npm test` (in-memory MongoDB). CI (`.github/workflows/ci.yml`) runs typecheck, tests and build for the server, and lint and build for the web app, on every push and pull request.

Headline properties:

- A duplicate send yields one stored message.
- A forced disconnect followed by reconnect + sync yields no gaps and no duplicates.

Also checked by hand against the dev stack (two browser sessions): messages sent while the recipient's socket was down arrived in `seq` order after reconnect, with no history refetch over REST, and `migrate:seq` numbered existing dev data and was a no-op on the second run.

`server/test/delivery.test.ts`:

- handshake
  - emits server:hello with the supported features
- idempotent sends
  - returns the same message for a repeated socket send and notifies the recipient once
  - collapses concurrent identical sends into one message
  - is idempotent over REST and rejects reuse in another conversation
  - validates clientMessageId and omits it when absent
- ordering
  - assigns unique contiguous seqs to concurrent sends from two users
- messages:sync
  - returns messages after the cursor in ascending order
  - caps a batch at 100 and flags it incomplete
  - returns an empty incomplete result for non-participants and unknown conversations
  - rejects invalid payloads, tolerates a missing ack and rate limits
  - recovers exactly the messages missed during a disconnect
- history pagination
  - reports hasMore false for exactly limit messages
  - reports hasMore true for limit+1 and false on the next page
  - rejects a before cursor from another conversation or an unknown message
- backfillSeq
  - numbers legacy messages in _id order, sets lastSeq and is idempotent

## Limits

- No read receipts or delivery receipts beyond "the server stored it".
- The sender's other tabs or devices do not get their own messages live (the sender is excluded from `message:new`). They catch up on the next sync or refetch.
- Single server instance. To run two, add the Socket.io Redis adapter (and sticky sessions for the polling transport); `seq` allocation already lives in MongoDB, so ordering holds across instances.
