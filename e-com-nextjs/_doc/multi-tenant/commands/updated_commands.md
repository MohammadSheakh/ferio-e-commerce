# Ferio Multi-Tenant Run Commands

This document updates the old command notes for the current SaaS codebase.

Important:

- This repo does **not** expose a single pnpm workspace root.
- Run commands from the app directory you are working in.
- Do **not** modify `_doc/commands/_.md`; this file is the replacement runbook for the multi-tenant stack.

---

## 1. Project Layout At A Glance

- `ferio-nest-prisma` - shared NestJS backend
- `ferio-customer-web` - customer storefront Next.js app
- `ferio-admin-dashboard/ferio-admin` - tenant admin Next.js app
- `ferio-platform-admin` - platform admin Next.js app
- `ferio-mobile-expo54` - Expo customer mobile app
- `docker-compose.yml` - full stack: database, redis, minio, backend, and all web apps
- `docker-compose.infra.yml` - infra only: PostgreSQL, Redis, MinIO

---

## 2. Fastest Ways To Run The Stack

### 2.1 Full stack in Docker

Use this for demo, staging-like local testing, or when you want everything in one command.

```bash
cd e-com-nextjs
docker compose up -d --build
```

What this starts:

- PostgreSQL on host port `5433`
- Redis on host port `6379`
- MinIO on host ports `9000` and `9001`
- backend on `http://localhost:6733`
- customer web on `http://localhost:3000`
- tenant admin on `http://localhost:3001`
- platform admin on `http://localhost:3100`

What Docker does for you on first boot:

- creates `ferio_dev` and `ferio_platform`
- runs the tenant and platform migration services
- creates the `ferio-media` bucket in MinIO
- generates backend secrets into the `ferio_secrets` volume unless you override them

Useful follow-up commands:

```bash
docker compose ps
docker compose logs -f backend
docker compose logs -f customer-web admin-web platform-admin
docker compose down
docker compose down -v
```

### 2.2 Native apps with Docker infra only

Use this when you want hot reload on the apps but still want local PostgreSQL, Redis, and MinIO from Docker.

```bash
cd e-com-nextjs
docker compose -f docker-compose.infra.yml up -d
```

Then run the apps locally from their own folders.

---

## 3. Backend Commands

All backend commands below run from `e-com-nextjs/ferio-nest-prisma`.

### 3.1 Install

```bash
cd e-com-nextjs/ferio-nest-prisma
pnpm install
```

### 3.2 Environment setup

Copy the example env and fill the values you need.

```bash
cp .env.example .env
```

Minimum local values usually include:

- `DATABASE_URL`
- `PLATFORM_DATABASE_URL`
- `REDIS_HOST`
- `REDIS_PORT`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `PLATFORM_JWT_SECRET`
- `PLATFORM_DB_CREDENTIAL_KEY`
- `PLATFORM_CALLBACK_SECRET`
- `FILE_UPLOAD_STRATEGY`
- `R2_ENDPOINT` when using MinIO locally

If you need fresh secrets for local testing:

```bash
openssl rand -hex 48
openssl rand -hex 32
```

### 3.3 Prisma and database

Use `prisma:sync` after any Prisma schema change.

```bash
pnpm run prisma:sync
```

Tenant database migration:

```bash
pnpm run prisma:migrate:deploy
```

Platform control-plane migration:

```bash
pnpm run prisma:migrate:platform
```

Schema status check:

```bash
pnpm run prisma:migrate:status
```

Seed the database:

```bash
pnpm run prisma:seed
```

Prisma client generation only:

```bash
pnpm run prisma:generate
pnpm run prisma:generate:platform
```

### 3.4 Local dev server

```bash
pnpm run start:dev
```

Backend dev port:

- API: `http://localhost:6733/api/v1`
- Health: `http://localhost:6733/api/v1/health`
- Swagger: `http://localhost:6733/api/docs`

### 3.5 Production build and checks

```bash
pnpm run build
pnpm run lint
pnpm exec tsc --noEmit -p tsconfig.json
```

### 3.6 Tests

```bash
pnpm run test
pnpm run test:watch
pnpm run test:cov
pnpm run test:e2e
pnpm run test:integration
pnpm run test:queue-smoke
```

### 3.7 Backend utilities

Export the OpenAPI contract:

```bash
pnpm run openapi:export
```

Storage smoke test:

```bash
pnpm run storage:smoke
```

---

## 4. Customer Web Commands

All customer web commands below run from `e-com-nextjs/ferio-customer-web`.

### 4.1 Install

```bash
cd e-com-nextjs/ferio-customer-web
pnpm install
```

### 4.2 Environment setup

Create `.env.local` manually and set:

```env
NEXT_PUBLIC_FERIO_API_URL=http://localhost:6733/api/v1
FERIO_API_URL=http://localhost:6733/api/v1
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 4.3 Dev, build, and checks

```bash
pnpm dev
pnpm build
pnpm exec tsc --noEmit
pnpm lint
```

### 4.4 API code generation

Run this after regenerating `ferio-nest-prisma/openapi.json`.

```bash
pnpm run api:codegen
```

Customer web ports:

- Dev: `http://localhost:3002`
- Docker runtime: `http://localhost:3000`

---

## 5. Tenant Admin Commands

All tenant admin commands below run from `e-com-nextjs/ferio-admin-dashboard/ferio-admin`.

### 5.1 Install

```bash
cd e-com-nextjs/ferio-admin-dashboard/ferio-admin
pnpm install
```

### 5.2 Environment setup

Create `.env.local` manually and set:

```env
FERIO_API_URL=http://localhost:6733/api/v1
```

### 5.3 Dev, build, and checks

```bash
pnpm dev
pnpm build
pnpm exec tsc --noEmit
pnpm lint
```

### 5.4 API code generation

```bash
pnpm run api:codegen
```

Tenant admin ports:

- Dev: `http://localhost:3001`
- Docker runtime: `http://localhost:3001`

---

## 6. Platform Admin Commands

All platform admin commands below run from `e-com-nextjs/ferio-platform-admin`.

### 6.1 Install

```bash
cd e-com-nextjs/ferio-platform-admin
pnpm install
```

### 6.2 Environment setup

Create `.env.local` manually and set:

```env
PLATFORM_API_URL=http://localhost:6733/api/v1
```

### 6.3 Dev, build, and checks

```bash
pnpm dev
pnpm build
pnpm exec tsc --noEmit
pnpm lint
```

### 6.4 API code generation

```bash
pnpm run api:codegen
```

Platform admin ports:

- Dev: `http://localhost:3100`
- Docker runtime: `http://localhost:3100`

---

## 7. Mobile App Commands

All mobile commands below run from `e-com-nextjs/ferio-mobile-expo54`.

### 7.1 Install

```bash
cd e-com-nextjs/ferio-mobile-expo54
pnpm install
```

### 7.2 Environment setup

Create `.env` manually and set:

```env
EXPO_PUBLIC_FERIO_API_URL=http://localhost:6733/api/v1
```

Set `EXPO_PUBLIC_FERIO_API_URL` to your backend URL or LAN IP.

### 7.3 Dev and health checks

```bash
pnpm start
pnpm start -- --clear
pnpm android
pnpm ios
pnpm web
pnpm run typecheck
pnpm run doctor
pnpm run fix-deps
```

---

## 8. Migration And Codegen Order

Use this order when the backend schema or API changes.

```bash
cd e-com-nextjs/ferio-nest-prisma
pnpm run prisma:sync
pnpm run prisma:migrate:deploy
pnpm run prisma:migrate:platform
pnpm run openapi:export

cd ../ferio-customer-web
pnpm run api:codegen

cd ../ferio-admin-dashboard/ferio-admin
pnpm run api:codegen

cd ../../ferio-platform-admin
pnpm run api:codegen
```

If the backend OpenAPI contract changes, regenerate the frontend clients before building the apps.

---

## 9. Troubleshooting And Ops

### 9.1 Check what is listening on a port

```bash
lsof -i :6733
lsof -i :3000
lsof -i :3001
lsof -i :3100
```

### 9.2 Free busy ports

```bash
npx kill-port 6733 6734 3000 3001 3100
```

### 9.3 Check Docker status

```bash
cd e-com-nextjs
docker compose ps
docker compose logs -f backend
docker compose logs -f postgres redis minio
```

### 9.4 Reset local Docker data

```bash
cd e-com-nextjs
docker compose down -v
```

### 9.5 Verify infra-only services

```bash
cd e-com-nextjs
docker compose -f docker-compose.infra.yml up -d
```

### 9.6 Verify the backend contract

```bash
cd e-com-nextjs/ferio-nest-prisma
pnpm run build
pnpm run test
pnpm run openapi:export
```

---

## 10. Recommended Daily Flow

1. Start infra or full Docker stack.
2. Run `pnpm run prisma:sync` only when schema files changed.
3. Start the backend and the app you are working on.
4. Run the matching build or test command before finishing.

Suggested minimum checks:

```bash
cd e-com-nextjs/ferio-nest-prisma
pnpm run build
pnpm run test

cd ../ferio-customer-web
pnpm build

cd ../ferio-admin-dashboard/ferio-admin
pnpm build

cd ../../ferio-platform-admin
pnpm build
```

For the mobile app:

```bash
cd e-com-nextjs/ferio-mobile-expo54
pnpm run typecheck
pnpm run doctor
```
