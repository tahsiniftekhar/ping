# Ping — Real-Time Chat App

Real-time 1-to-1 and group chat (Next.js + TypeScript) against the provided
external API (REST + Socket.io). Landing page showcase included.

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

## API Documentation

The verified API contract (request/response shapes, quirks, and Socket.io
behavior) is documented in [`docs/API.md`](./docs/API.md).

## Thought Process

A concise write-up of the architecture, design, API issues, AI usage, and
trade-offs is in [`docs/WRITEUP.md`](./docs/WRITEUP.md).
