# Live Compose/BFF API Integration Shot 64

Date: 2026-09-11
Scope: full local Compose application runtime, frontend SSR/BFF smoke checks, and Redis service wiring.

## Evidence

- `docker compose -f docker-compose.yml -f redis-port.override.yml up -d` built and started the backend, customer web, tenant-admin web, platform-admin web, PostgreSQL, MinIO, migration jobs, and project Redis.
- PostgreSQL, MinIO, Redis, and the backend reported healthy after startup.
- The project Redis container was exposed temporarily on host port `6380` because an existing host Redis process already owned `127.0.0.1:6379`. The existing process was not stopped, replaced, or reconfigured. The backend retained container-internal `REDIS_HOST=redis` and `REDIS_PORT=6379`.
- `GET http://localhost:6733/api/v1/health` returned HTTP 200 with the standard success envelope and `data.status=ok`.
- Customer SSR root on port `3000` returned HTTP 200 for an explicit tenant-style host header.
- Tenant-admin SSR root on port `3001` returned HTTP 200.
- Platform-admin root on port `3100` returned the expected HTTP 307 redirect to `/login?next=%2F`.
- Customer BFF `GET /api/store-locations` with an unprovisioned host returned HTTP 404 with `TENANT_RESOLUTION_FAILED`; no tenant row or fake host mapping was created to force a green result.
- Project Redis returned `PONG` on host port `6380`.

## Fix

The backend Compose healthcheck referenced nonexistent `/api/v1/ready` and used
`localhost`, which resolved to an unreachable address inside the image. It now
probes the active `/api/v1/health` route through `127.0.0.1` and has a 30-second
startup grace period. After recreation, `ferio-backend` reported `healthy`.

## Boundary

This is local runtime evidence, not production evidence. The shot does not
claim two provisioned tenants, browser-level SSR/BFF isolation, Cloudflare
Tunnel forwarding, managed Redis, provider delivery, or production failover.
The existing host Redis collision was handled without touching its process.
