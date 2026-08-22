# Thought Process

## Architecture & Technical Decisions

### Architecture

- **Next.js + React**
  - Already required by the assignment.
  - Used App Router and kept route-level pages thin.
  - UI components are separated from API/query logic.

- **Feature-based structure**
  - Separated `auth`, `users`, `conversations`, and `messages`.
  - Keeps API calls and query logic close to the feature instead of putting everything inside components.

- **TanStack Query**
  - Used for server state, caching, loading/error states, pagination, and invalidation.
  - I didn't add Redux or another global store, because almost all of the app's state is server state.

- **Socket.io**
  - One socket connection per authenticated session.
  - Socket events update/invalidate the existing TanStack Query cache.
  - I intentionally avoided an extra event bus, message manager, or global realtime store.

- **Local pending message state**
  - Server messages remain authoritative.
  - Pending/failed messages are kept locally until the server confirms them.
  - This makes retry/failure states possible without pretending an unsent message is already server data.

### Important trade-offs

- **Query invalidation instead of aggressive optimistic updates**
  - Used for group mutations.
  - Slightly less immediate than manual cache updates, but safer because the API returns the updated group and some socket events can be emitted even when a mutation fails.

- **Socket events are not treated as mutation confirmation**
  - `conversation:updated` only triggers cache invalidation.
  - REST response/refetch is treated as the source of truth.

- **Socket.io is the only send path**
  - Sends go over `message:send` with a socket acknowledgement; there is no REST fallback.
  - I kept this aligned with the verified realtime API instead of adding an unverified second path.
  - On success the ack is `{ ok: true }`; on failure it returns `{ ok: false, error }`. The ack contains no message id, and the sender never gets a `message:new` for their own message.

### Message history

- API returns messages newest-first.
- `before` uses the oldest loaded message `_id` as the cursor.
- Pages stay in the API's newest-first format.
- The UI normalizes them into chronological order.
- Older messages are prepended while preserving the user's scroll position.
- New messages do not force-scroll the user when they are reading older history.

---

## Landing Page Design

- Chose a **quiet editorial direction** instead of a typical SaaS/AI landing page.
- Used:
  - Warm off-white background
  - Near-black typography
  - Restrained accent color
  - Strong typography
  - Generous but controlled spacing
  - Minimal navigation
  - Subtle motion

- I took some inspiration from Apple and Google's design language:
  - Clear hierarchy
  - Strong whitespace
  - Limited visual noise
  - Simple interactions
  - Product-first presentation

- Avoided:
  - Generic gradients
  - Excessive glassmorphism
  - Stock illustrations
  - Fake testimonials
  - Large decorative sections with no product purpose

- The hero visual represents **conversation itself**, rather than a generic dashboard screenshot.
- I built for mobile from the start, not as an afterthought.

---

## API Issues & How I Handled Them

### Message pagination

- The API returns messages newest-first.
- `before` expects a message `_id` and returns older messages.
- Implemented cursor pagination around the actual API behavior.
- Added scroll anchoring when older messages are loaded.

### Pagination off-by-one

- A conversation with exactly 30 messages can still return `hasMore: true`.
- This causes one extra request returning an empty page.
- Left it unchanged because it is harmless and appears to be an API-side issue.

### Group mutation events

- `conversation:updated` is emitted for rename, add, remove, leave, and promotion.
- The event contains the full group.
- A failed mutation can also emit the event.
- So the client does not assume that receiving the event means the mutation succeeded.
- Query invalidation + REST refetch remains the authority.

### Removed participants

- A removed participant can receive the `conversation:updated` event for their own removal.
- After removal they stop receiving new `message:new` events.
- Sending after removal fails through the socket acknowledgement.
- No special client-side assumption was added based only on the event.

### Group authorization

- Non-admin group mutations return `403 FORBIDDEN`.
- Admin controls are hidden in the UI for non-admin users.
- Server-side authorization is still treated as authoritative.

### User search

- The search API appears to interpret the query as a regular expression.
- Characters such as `+`, `.`, `*`, `(` and `[` can therefore cause unexpected matching or regex errors.
- Added a small `escapeRegex` helper before sending search queries.
- The original text remains unchanged in the UI.

### Other API quirks

- Malformed conversation IDs can produce a `500` with a leaked Mongo-related error.
- Well-formed unknown IDs return `404`.
- I did not try to hide or redesign these server-side behaviors in the frontend.

---

## AI Usage

- Used AI tools throughout the task for:
  - Codebase exploration
  - API investigation
  - Implementation assistance
  - Debugging
  - Reviewing architecture
  - Drafting documentation
  - Finding edge cases
  - Browser-based verification planning

- I did not treat generated code as automatically correct.
- Important API behavior was verified against the live API before depending on it.
- Browser flows were tested manually and through browser automation.
- Realtime behavior was tested with multiple clients.

- **One concrete example of rejecting a suggestion:** the first draft suggested full optimistic message sending (append the message → reconcile by id → rollback on error). I rejected it because the socket ack returns no message id, so you cannot safely correlate a sent message with a server one. I used a pending-state approach instead.

- The final architecture decisions, API assumptions, trade-offs, and UI direction were reviewed against the actual project rather than accepted blindly from AI output.

---

## What I'd Improve With More Time

- Add automated tests for:
  - Message pagination
  - Realtime message insertion
  - Pending/failed message reconciliation
  - Group permissions
  - Search sanitization

- Improve socket connection-state UX:
  - Distinguish `connecting`, `connected`, `reconnecting`, and `disconnected`.
  - Avoid showing "Reconnecting..." during the initial connection window.

- Persist the selected conversation in the URL so refresh/share behavior is more predictable.

- Improve offline/reconnection handling.

- Fix the regex behavior at the API level instead of relying only on client-side escaping.

- Add stronger production observability and error reporting.

- Improve accessibility testing beyond the current browser verification.
