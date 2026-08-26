# Running Ferio — Docker & Native Modes

Two supported ways to run the platform. Both use the same env contract and
the same code; pick per workflow.

---

## Mode A — Full stack in Docker (demo / alpha / single server)

```bash
cd e-com-nextjs
docker compose up -d --build
```

First boot automatically:
1. creates `ferio_dev` + `ferio_platform` databases (init-db.sql);
2. runs **tenant** migrations (canonical chain) and **platform** migrations
   (control plane) as one-shot services — the backend waits for both;
3. starts MinIO with bucket `ferio-media` (S3-compatible stand-in for R2);
4. generates strong secrets (JWT access/refresh, platform keys, credential
   encryption key) into the `ferio_secrets` volume — restarts reuse them;
   explicit env values always win;
5. boots the backend (`/api/v1/health` returns 200) and the three UIs.

| Surface | URL |
|---|---|
| Backend API | http://localhost:6733/api/v1 |
| Customer Web | http://localhost:3000 |
| Tenant Admin | http://localhost:3001 |
| Platform Admin | http://localhost:3100 (login: owner@ferio.local) |
| MinIO console | http://localhost:9001 |

Useful:
```bash
docker compose logs -f backend          # follow API logs
docker compose down                     # stop (keep data)
docker compose down -v                  # stop and wipe volumes
```

## Mode B — Native dev (no app containers)

Run only infrastructure in Docker, apps with pnpm/hot reload:

```bash
docker compose -f docker-compose.infra.yml up -d
```

Then in `ferio-nest-prisma/.env` (see `.env.example`):

```env
DATABASE_URL=postgresql://ferio:ferio@localhost:5433/ferio_dev
PLATFORM_DATABASE_URL=postgresql://ferio:ferio@localhost:5433/ferio_platform
REDIS_HOST=localhost
REDIS_PORT=6379
FILE_UPLOAD_STRATEGY=r2
R2_ENDPOINT=http://localhost:9000
R2_BUCKET=ferio-media
R2_ACCESS_KEY_ID=minioadmin
R2_SECRET_ACCESS_KEY=minioadmin
JWT_ACCESS_SECRET=<openssl rand -hex 48>
JWT_REFRESH_SECRET=<openssl rand -hex 48>
PLATFORM_JWT_SECRET=<openssl rand -hex 48>
PLATFORM_DB_CREDENTIAL_KEY=<openssl rand -hex 32>
PLATFORM_CALLBACK_SECRET=<openssl rand -hex 32>
TENANCY_ENABLED=false        # flip true when a tenant domain resolves
```

One-time + after pulls:

```bash
pnpm install
pnpm prisma:generate                       # tenant + platform clients
DATABASE_URL=… pnpm prisma:migrate:deploy  # tenant chain
pnpm prisma:migrate:platform               # control-plane chain
pnpm storage:smoke                         # optional: verify bucket roundtrip
```

Run apps:

```bash
pnpm start:dev            # backend :6733
cd ../ferio-customer-web && pnpm dev   # :3000
cd ../ferio-admin-dashboard/ferio-admin && pnpm dev  # :3001
cd ../ferio-platform-admin && pnpm dev              # :3100
```

## Mode C — No Docker at all

Any reachable PostgreSQL 16 + Redis work. Point the two `*_DATABASE_URL`s at
your instances (both planes may share one server but MUST be separate
databases), skip MinIO (`FILE_UPLOAD_STRATEGY` unset → uploads disabled),
generate secrets yourself. Everything else identical to Mode B.

---

## Verification cheatsheet

```bash
pnpm exec tsc --noEmit -p tsconfig.json   # strict typecheck incl specs
pnpm test                                  # unit suites
TEST_DATABASE_URL=… pnpm test:integration  # real-PostgreSQL integration
pnpm build                                 # production build
# prod-bootstrap smoke (boots compiled app, exports contract):
OPENAPI_EXPORT=1 node dist/src/main.js && cat openapi.json | head
```

CI runs all of these plus an OpenAPI drift gate.
