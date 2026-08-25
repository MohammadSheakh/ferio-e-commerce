# Running Ferio Commerce SaaS

Two supported modes: **native** (no Docker, fastest dev loop) and **full-stack Docker** (reproducible, demo/alpha-ready).

---

## Mode 1 — Native (no Docker)

### Prerequisites
- Node.js 20 + pnpm 9 (`corepack enable && corepack prepare pnpm@9 --activate`)
- PostgreSQL 14+ running locally (any user with CREATEDB)
- Redis 7 running locally

### Setup

```bash
# 1. Install dependencies (all apps)
cd e-com-nextjs/ferio-nest-prisma && pnpm install
cd ../ferio-customer-web && pnpm install
cd ../ferio-admin-dashboard/ferio-admin && pnpm install
cd ../../ferio-platform-admin && pnpm install

# 2. Generate Prisma clients (both)
cd ../ferio-nest-prisma
pnpm prisma:generate

# 3. Configure environment (copy example, edit values)
cp .env.example .env
# Edit .env: set DATABASE_URL, PLATFORM_DATABASE_URL,
#            JWT_ACCESS_SECRET, JWT_REFRESH_SECRET,
#            PLATFORM_JWT_SECRET, PLATFORM_DB_CREDENTIAL_KEY

# 4. Create databases (if they don't exist)
createdb ferio_dev
createdb ferio_platform

# 5. Apply migrations
DATABASE_URL="postgresql://your_user:your_pass@localhost:5432/ferio_dev" \
  pnpm prisma migrate deploy
PLATFORM_DATABASE_URL="postgresql://your_user:your_pass@localhost:5432/ferio_platform" \
  pnpm prisma migrate deploy --schema prisma/platform.prisma
```

### Run

```bash
# Terminal 1: Backend
pnpm start:dev   # http://localhost:6733

# Terminal 2: Customer Web
cd ../ferio-customer-web && pnpm dev   # http://localhost:3000

# Terminal 3: Admin Web
cd ../ferio-admin-dashboard/ferio-admin && pnpm dev   # http://localhost:3001

# Terminal 4: Platform Admin
cd ../ferio-platform-admin && pnpm dev   # http://localhost:3100
```

### Tests

```bash
cd ferio-nest-prisma

# Unit tests (no database needed)
pnpm test

# Integration tests (needs disposable PostgreSQL with CREATE DATABASE)
TEST_DATABASE_URL="postgresql://user:pass@localhost:5432/some_test_db" \
  pnpm test:integration
```

---

## Mode 2 — Docker Compose

### Quick start (full stack)

```bash
docker compose up -d --build

# Services:
#   Backend:        http://localhost:6733
#   Customer Web:   http://localhost:3000
#   Admin Web:      http://localhost:3001
#   Platform Admin: http://localhost:3100
```

### Infra only (run apps natively against containers)

```bash
docker compose -f docker-compose.infra.yml up -d
# PostgreSQL on :5432, Redis on :6379
```

---

## Environment Variables Reference

| Variable | Used by | Purpose |
|---|---|---|
| `DATABASE_URL` | backend | Tenant commerce database |
| `PLATFORM_DATABASE_URL` | backend | Control-plane metadata database |
| `REDIS_HOST` / `REDIS_PORT` | backend | Cache + job queue |
| `JWT_ACCESS_SECRET` | backend | Tenant/admin auth tokens |
| `JWT_REFRESH_SECRET` | backend | Refresh token signing |
| `PLATFORM_JWT_SECRET` | backend | Platform admin realm tokens |
| `PLATFORM_DB_CREDENTIAL_KEY` | backend | AES key for tenant DB credentials |
| `PLATFORM_CALLBACK_SECRET` | backend | HMAC for payment callback binding |
| `TENANCY_ENABLED` | backend | `false`=legacy mode; `true`=strict tenant resolution |
| `NEXT_PUBLIC_FERIO_API_URL` | web apps | Backend API URL |

## Multi-Tenancy Staged Rollout

1. Default: `TENANCY_ENABLED=false` → all requests pass through without tenant context (current behavior preserved)
2. When ready: set `TENANCY_ENABLED=true` → strict fail-closed resolution per host
3. Unknown domains return stable error codes → Customer Web renders full-page state
