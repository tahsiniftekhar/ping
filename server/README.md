# Ping server

Realtime chat backend for Ping: an Express 5 REST API and a Socket.io server on one HTTP port, backed by MongoDB (Mongoose). It implements the contract documented in [`../docs/API.md`](../docs/API.md), so the web client works against it unchanged.

## Run locally

Requires Node 22+ and a MongoDB instance.

```bash
cd server
cp .env.example .env     # then export the variables, or use your shell/IDE to load them
npm install
npm run dev              # tsx watch with pretty logs
```

`npm run dev` loads `.env` automatically. In production the variables come from the environment (see `../deploy`).

Quick check: `curl localhost:4000/health` returns `{"status":"ok"}`.

## Environment

| Variable | Default | Notes |
|---|---|---|
| `NODE_ENV` | `development` | `development`, `test` or `production` |
| `PORT` | `4000` | |
| `MONGODB_URI` | required | |
| `JWT_SECRET` | required | at least 32 characters |
| `JWT_EXPIRES_IN` | `7d` | any `jsonwebtoken` duration |
| `CORS_ORIGINS` | empty | comma-separated browser origins; required in production, `http://localhost:3000` is allowed by default in development |
| `TRUST_PROXY` | `1` in production, else `0` | number of reverse proxies in front of the server |
| `LOG_LEVEL` | `info` | pino level |

Invalid configuration aborts startup with a list of the offending variables.

## Scripts

| Script | |
|---|---|
| `npm run dev` | watch mode |
| `npm run build` | compile to `dist/` |
| `npm start` | run the compiled server |
| `npm run typecheck` | `tsc --noEmit` over source and tests |
| `npm test` | vitest integration tests (in-memory MongoDB; the first run downloads a mongod binary) |

## Layout

```
src/
  index.ts        bootstrap and graceful shutdown
  app.ts          express app (middleware, routes, /health)
  config/         env validation
  lib/            errors, jwt, logger, zod helpers
  middleware/     auth, rate limiting, error handling
  modules/        users, auth, conversations, messages (model, routes, service, schemas)
  realtime/       socket.io server and the emitter services use to publish events
test/             integration tests
```

## Contract notes

- Errors are always `{ "error": { "message", "code", "details"? } }`. Malformed ids are `400 VALIDATION_ERROR`, never `500`.
- `message:new` goes to every participant's `user:<id>` room except the sender; `conversation:updated` goes to all current members and to a removed or leaving member.
- User search un-escapes the regex escaping the web client applies, then escapes once itself, so `+` phone queries work.

## Security notes

- Passwords do not exist: login is phone plus name and issues an HS256 JWT. Treat phone numbers as identifiers, not secrets, and do not expose this server to untrusted users without adding real verification.
- `helmet`, an explicit CORS allowlist, a 16 kb JSON body limit, and `express-rate-limit` (login 10/min/IP, API 300/min/IP) are enabled. Per-socket sending is limited to 20 messages per 10 seconds.
- All input is validated with zod, regex input is escaped, and unknown errors return a generic `500` while the real error is logged.
- Set `TRUST_PROXY` to match your proxy chain so rate limiting sees client IPs.
- The container runs as the non-root `node` user and exposes a `HEALTHCHECK` on `/health`.

## Local test accounts

Login auto-registers, so any phone number works locally. The manual QA flow uses:
`+15550000001` (Ada Lovelace), `+15550000002` (Grace Hopper), `+15550000003` (Alan Turing).
