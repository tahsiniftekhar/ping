# Ping API deployment

Production runs on a Linux VPS with Docker: Caddy (TLS, ports 80/443) → API (port 4000, internal only) → MongoDB (internal only).

## Overview

```
Browser → Vercel (Next.js frontend)
Browser → https://API_DOMAIN → Caddy → api:4000 → mongo
```

- The frontend is hosted on Vercel and is not part of this stack.
- Only Caddy publishes ports. The API and MongoDB are reachable only on the Docker network.

## Prerequisites

- A VPS with Docker Engine and the compose plugin (`docker compose version`).
- A domain or subdomain (for example `api.example.com`) with an A record pointing at the VPS. Add an AAAA record if the VPS has IPv6.
- Ports 80 and 443 open (TCP, and UDP 443 for HTTP/3).

## First deploy

```bash
git clone <repo-url> ping && cd ping/deploy
cp .env.example .env
# Edit .env: set API_DOMAIN, JWT_SECRET, CORS_ORIGINS
#   JWT_SECRET: openssl rand -base64 48

docker compose up -d --build
docker compose ps                 # api and mongo should be "healthy"
curl https://$API_DOMAIN/health   # load the value from .env, or use the literal hostname
```

Caddy requests the certificate on first request. If `/health` fails, see Troubleshooting.

## Firewall (ufw)

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 443/udp
sudo ufw enable
```

MongoDB is never published to the host, so no firewall rule is needed for it.

## Connect the Vercel frontend

1. In the Vercel project settings, set:
   - `NEXT_PUBLIC_API_BASE_URL=https://API_DOMAIN/api`
   - `NEXT_PUBLIC_SOCKET_URL=https://API_DOMAIN`
2. Redeploy the frontend. `NEXT_PUBLIC_*` values are baked in at build time, so a redeploy is required after any change.
3. Add the Vercel production URL (and the preview domain, if wanted) to `CORS_ORIGINS` in `deploy/.env`, comma-separated.
4. Apply the change:

   ```bash
   docker compose up -d
   ```

## Updating

```bash
git pull
docker compose up -d --build
docker compose logs -f api
```

## Backups

Create a backup:

```bash
docker compose exec -T mongo mongodump --archive --gzip > backup-$(date +%F).gz
```

Restore:

```bash
docker compose exec -T mongo mongorestore --archive --gzip < backup-YYYY-MM-DD.gz
```

Run the backup daily with cron, for example (`crontab -e`):

```
0 3 * * * cd /path/to/ping/deploy && docker compose exec -T mongo mongodump --archive --gzip > /var/backups/ping/backup-$(date +\%F).gz
```

Create `/var/backups/ping` first, and copy backups off the VPS regularly.

## Local development

1. From the repo root, start MongoDB (bound to localhost only):

   ```bash
   docker compose -f deploy/docker-compose.dev.yml up -d
   ```

2. Run the API:

   ```bash
   cd server
   cp .env.example .env
   npm install
   npm run dev
   ```

3. Point the frontend's `.env.local` at the local API:

   ```
   NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api
   NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
   ```

## Troubleshooting

- **Certificate not issued.** Check that the A record (and AAAA, if set) resolves to the VPS: `dig +short $API_DOMAIN`. Check that ports 80 and 443 are open. Caddy needs port 80 for the ACME challenge. Read the logs with `docker compose logs caddy`.
- **CORS errors in the browser.** The frontend origin is missing from `CORS_ORIGINS`. Add it to `deploy/.env`, then run `docker compose up -d`.
- **WebSocket not connecting.** Check the Caddy logs with `docker compose logs -f caddy`. Confirm `NEXT_PUBLIC_SOCKET_URL` is the host root (`https://API_DOMAIN`, not `/api`), and that the frontend was redeployed after the change.
- **502 Bad Gateway.** The API is unhealthy or not running. Check `docker compose ps` and `docker compose logs api`.
