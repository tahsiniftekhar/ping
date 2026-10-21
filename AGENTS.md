# AGENTS.md — Working Guide for Coding Agents

## Project purpose

A real-time chat application (1-to-1 and group) built as a Senior Frontend Engineer
take-home. React/Next.js frontend talking directly to an external chat API
(REST + Socket.io). Deliverables: API docs, chat screens, a creative landing page,
and a thought-process write-up.

## Core stack

- Next.js (App Router) + TypeScript (strict)
- Tailwind CSS v4 + shadcn/ui (`src/components/ui`)
- TanStack Query for all server state
- socket.io-client for realtime
- ESLint (`npm run lint`)

## Architectural rules

- **Feature-oriented structure.** App code lives in `src/app` (routes), `src/components`
  (UI: `ui/`, `auth/`, `chat/`, `landing/`), `src/features/<name>` (feature logic:
  hooks, queries, mutations), `src/lib` (`api/`, `socket/`, `utils/`), `src/hooks`,
  `src/providers`, `src/types`.
- **All REST calls go through `src/lib/api/client.ts`** (`apiClient`). No direct
  `fetch` in components or features. No Next.js API-route proxy — the browser calls
  the external API directly (CORS is supported by the API).
- **All server state is TanStack Query.** No manual fetching, no server data in
  `useState`/context. Local React state only for UI concerns (input drafts, scroll
  position, modals, selected conversation).
- **Socket.io connects to the API host root** (`NEXT_PUBLIC_SOCKET_URL`), never to
  `/api`. Socket code lives in `src/lib/socket/`; socket events feed into the Query
  cache (e.g. `message:new` → cache update), not into separate state stores.
- **Types in `src/types/api.ts` model only verified API shapes.** Do not invent
  response fields. Verify against the live API (see `docs/API.md`) before extending.
- **No Redux.** No global state library unless a demonstrated need appears.
- **No speculative abstractions.** Don't add wrappers/repositories/service layers
  that have exactly one caller.

## Coding conventions

- TypeScript strict; no `any` unless unavoidable (prefer `unknown` + narrowing).
- Server components by default in `src/app`; add `"use client"` only where needed
  (hooks, event handlers, sockets).
- Components: named exports, PascalCase files for components, camelCase for
  utilities/hooks. Hook prefixes: `use*`.
- Query keys: array literals, centralized per-feature (e.g. `conversationKeys`).
- Mutations invalidate/update the relevant queries; sockets may patch caches
  directly to avoid refetch storms.
- Comments only for non-obvious constraints (e.g. API quirks). No narration comments.
- Environment values only via `src/lib/env.ts`. Never hardcode the API URL.

## API boundary

- REST base: `NEXT_PUBLIC_API_BASE_URL` (…/api). Socket: `NEXT_PUBLIC_SOCKET_URL` (host root).
- Auth: JWT bearer for REST; `auth: { token }` in the Socket.io handshake.
- Known quirks and unverified behavior are cataloged in `docs/API.md` — read it
  before writing API-touching code. Highlights: `/users/search` returns a bare
  array; `/conversations` wraps in `{ data }`; history wraps in
  `{ messages, hasMore }`; `lastMessage` can be `{}`; direct vs group conversation
  items have different shapes (`participant` vs `participants`); `POST /messages`
  can return 200 with `null`.

## Realtime boundary

- Client → server: `message:send` `{ conversationId, text }`.
- Server → client: `message:new`, `conversation:updated`.
- The socket is created once per authenticated session and torn down on logout.
- Delivery protocol (self-hosted `server/` only, see `docs/delivery.md`): the server
  announces it with `server:hello`; the client then sends `clientMessageId`, orders by
  `seq` and replays with `messages:sync`. Without `server:hello` (hosted API) the client
  must keep the legacy behavior — never send the new fields unconditionally.

## Backend (`server/`)

- Standalone Express 5 + Socket.io + MongoDB (Mongoose) service with its own
  `package.json`, deployed separately (Docker on a VPS, see `deploy/README.md`).
  It is excluded from the Next.js build, lint and Vercel upload.
- It implements the contract in `docs/API.md` exactly, so the frontend works against
  it or the original hosted API by switching only `NEXT_PUBLIC_*` env vars.
- Structure: `src/modules/<feature>/` (routes, service, schemas, model),
  `src/realtime/` (socket server + emitter), `src/middleware`, `src/lib`, `src/config`.
  Services emit realtime events through `realtime/emitter.ts`, never via socket setup.
- Validate every input with zod; errors use the `{ error: { message, code, details? } }`
  envelope. Add an integration test in `server/test/` for any contract change.
- `npm run typecheck`, `npm run build` and `npm test` in `server/` must pass.

## What NOT to build

- No registration flow (login auto-registers), no password/OAuth screens.
- No message editing/deletion, read receipts, typing indicators, push
  notifications, file upload — not in the assignment scope.
- No mock data or fake backends inside the frontend, and no Next.js server-side data
  fetching of chat data. The real backend lives in `server/` (see below).
- No scope creep before Parts 1–2 are complete.

## Testing expectations

- This is a 24-hour take-home: prioritize working features over test coverage,
  but keep code testable (pure helpers in `src/lib`, hooks separable from UI).
- `npm run lint` and `npm run build` must pass before any task is considered done.
- Manual verification: exercise loading, empty, and error states for every screen.

## Git/commit expectations

- Do not commit unless explicitly asked. Keep changes in the working tree.
- When asked, use small, imperative commit messages (e.g. `feat(chat): message list with pagination`).

## Definition of done

- Feature works against the live API (not just happy path).
- Loading / empty / error states handled.
- Lint and production build pass.
- `docs/API.md` updated if new API behavior was discovered.
- No TODOs left in code without a corresponding note to the user.
