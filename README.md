# Ping — Real-Time Chat App

Ping is a realtime messaging app for direct and group conversations: a Next.js
frontend (deployed on Vercel) and its own Express + Socket.io + MongoDB backend
(`server/`, deployed with Docker on a VPS). The frontend also runs unchanged against
the original hosted chat API.

## Features

- **Authentication** — login by phone number (login doubles as registration).
  Session restored on reload via `GET /auth/me`.
- **Direct conversations** — search users and start a direct chat.
- **Group conversations** — create groups, add/remove members, rename, promote
  admins, and leave. Admin-only controls with server-side authorization.
- **Realtime messaging** — Socket.io `message:send` / `message:new` with
  pending → sent → failed states, retry, and dismiss.
- **Message history** — cursor-based "load older" pagination with scroll
  anchoring, plus realtime cache integration.
- **Landing page** — a quiet, editorial product page with a custom
  conversation-style hero.
- **Dark mode** — light, dark, or system preference, applied without a flash
  on load.
- **Shareable conversation URLs** — each conversation is addressable at
  `/chat?c=<id>`.
- **Unread indicators** — client-side unread dots per conversation, unread
  counts on the filter tabs, and a count in the browser tab title.
- **Search and filters** — search conversations and filter between Direct and
  Groups.
- **Message presentation** — date separators, message grouping, link detection,
  and copy message.
- **Jump to latest** — a jump control shows the number of new messages received
  while scrolled up.
- **Drafts** — per-conversation drafts preserved (sessionStorage) while
  switching chats.
- **Reconnect resync** — conversations and message history are refetched after
  a Socket.io reconnect, since missed events are not replayed.
- **Cold-start aware sign-in** — the sign-in screen explains the delay when the
  free-tier API is waking up.

## Tech Stack

- **Next.js (App Router) + TypeScript** (strict)
- **Tailwind CSS v4** + shadcn/ui (`src/components/ui`)
- **TanStack Query** — all server state (caching, pagination, invalidation)
- **socket.io-client** — realtime messaging
- **ESLint** for linting

## Getting Started

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000.

### Scripts

- `npm run dev` — development server
- `npm run build` — production build
- `npm run start` — serve the production build
- `npm run lint` — ESLint

## Environment Variables

Copy `.env.example` to `.env.local` and fill in the two values:

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | REST base URL of the chat API (e.g. `https://host.com/api`) |
| `NEXT_PUBLIC_SOCKET_URL` | Socket.io host root (e.g. `https://host.com`, not `/api`) |

Both are read only through `src/lib/env.ts`. The app fails loudly at module
load if either is missing.

## Architecture

The app is feature-oriented: thin route pages in `src/app`, presentation in
`src/components`, and feature logic (API calls, queries, hooks) in
`src/features`. All REST traffic goes through one client (`src/lib/api/client.ts`)
and all realtime traffic through a single socket per authenticated session
(`src/lib/socket`). Server state lives in TanStack Query; the socket updates
the same caches.

See [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) for the full structure and
data-flow, and [`docs/DECISIONS.md`](./docs/DECISIONS.md) for the key
architectural trade-offs.

## Backend

`server/` is a standalone Node.js service implementing the same REST + Socket.io
contract. See [`server/README.md`](./server/README.md) for local development and
[`deploy/README.md`](./deploy/README.md) for production deployment (Docker Compose
with MongoDB and Caddy for automatic HTTPS).

Run everything locally:

```bash
docker compose -f deploy/docker-compose.dev.yml up -d   # MongoDB
cd server && cp .env.example .env && npm install && npm run dev
```

Then point `.env.local` at `http://localhost:4000/api` and `http://localhost:4000`.

### Docker deployment (behind a reverse proxy)

`deploy/docker-compose.yml` bundles its own Caddy for a standalone server. Behind an existing
reverse proxy, run only the `api` and `mongo` services and proxy
`https://api-ping.tahsiniftekhar.com` to the API container (port 4000).

- Image: `ghcr.io/tahsiniftekhar/ping-api` (tags `latest`, `sha-<short>`), built by
  `.github/workflows/docker-image.yml` on every push to `main`. Never built on the server.
- Container: `NODE_OPTIONS=--max-old-space-size=128` is baked in, runs as the non-root
  `node` user, logs to stdout, listens on `PORT` (default 4000). Sized for 192 MB / 0.5 CPU.
- Required env: `NODE_ENV=production`, `MONGODB_URI`, `JWT_SECRET` (>= 32 chars),
  `CORS_ORIGINS` (the Vercel origin). Optional: `PORT`, `LOG_LEVEL`, `JWT_EXPIRES_IN`.
- `TRUST_PROXY=2`: Cloudflare -> Caddy -> app is two proxy hops. It is a hop count and is
  parsed as a number (the default in production is 1, for a single proxy).

Demo data is reset with a full drop-and-seed (users, conversations, messages), safe to
repeat, run it nightly from cron. It refuses to start (exit 1, nothing touched)
unless `DEMO_RESET_ALLOWED=true` is set and `MONGODB_URI` names the database `ping`; add
`--check` to run only that guard:

```bash
docker compose run --rm --no-deps -e DEMO_RESET_ALLOWED=true api node dist/scripts/reset-demo.js
# or, with plain docker:
docker run --rm --network <net> -e MONGODB_URI=mongodb://mongo:27017/ping -e DEMO_RESET_ALLOWED=true \
  ghcr.io/tahsiniftekhar/ping-api:latest node dist/scripts/reset-demo.js
```

There are no passwords: login is phone + name. Demo accounts (phone): `+15550100001`
(Demo User, owner of most chats), `+15550100002`, `+15550100003`, `+15550100004`,
`+15550100005`. Demo data is reset and re-seeded nightly.

## API Documentation

The verified API contract (request/response shapes, quirks, and Socket.io
behavior) is documented in [`docs/API.md`](./docs/API.md).

## Thought Process

A concise write-up of the architecture, design, API issues, AI usage, and
trade-offs is in [`docs/WRITEUP.md`](./docs/WRITEUP.md).
