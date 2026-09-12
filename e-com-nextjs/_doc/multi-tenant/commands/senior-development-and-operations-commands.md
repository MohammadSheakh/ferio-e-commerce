# Ferio Senior Development, Database, Docker, and Test Commands

This is the operational command reference for the Ferio multi-tenant repository.
It covers local development, Docker, Prisma, PostgreSQL, Redis, MinIO,
backend checks, frontend checks, API contract generation, and release-style
validation.

Run commands from the directory shown. Do not commit local env files, tunnel
credentials, JWT keys, database passwords, access tokens, generated dumps, or
runtime logs.

The mobile workspace is included for completeness, but the multi-tenant
Release 1 audit explicitly excludes ferio-mobile-expo54.

## 1. Repository map

    e-com-nextjs/
      docker-compose.yml
      docker-compose.infra.yml
      docker-compose.production.yml
      docker-compose.tunnel-staging.yml
      ferio-nest-prisma/                 NestJS backend and Prisma
      ferio-customer-web/                customer storefront
      ferio-admin-dashboard/ferio-admin/ tenant admin
      ferio-platform-admin/              platform admin
      ferio-mobile-expo54/               Expo mobile app
      _doc/multi-tenant/commands/        command runbooks

## 2. Required tools

Check the local toolchain:

    node --version
    pnpm --version
    docker --version
    docker compose version
    git --version

Install pnpm if the repository does not already provide it:

    corepack enable
    corepack prepare pnpm@latest --activate

Install dependencies independently in each workspace:

    cd e-com-nextjs/ferio-nest-prisma
    pnpm install

    cd ../ferio-customer-web
    pnpm install

    cd ../ferio-admin-dashboard/ferio-admin
    pnpm install

    cd ../../ferio-platform-admin
    pnpm install

For mobile only:

    cd ../ferio-mobile-expo54
    pnpm install

## 3. Environment files

Backend:

    cd e-com-nextjs/ferio-nest-prisma
    cp .env.example .env

Customer web:

    cd ../ferio-customer-web
    cp .env.example .env.local

Platform admin:

    cd ../ferio-platform-admin
    cp .env.example .env.local

The tenant admin and mobile examples may require manual creation of local env
files. Never copy production secrets into development.

For the Docker stack, the compose project root is e-com-nextjs. Use the root
.env only for non-secret local overrides. Keep tunnel-only values in the
untracked .env.tunnel-staging.local described by the Cloudflare runbook.

## 4. Docker lifecycle

### 4.1 Full local stack

    cd e-com-nextjs
    docker compose up -d --build
    docker compose ps
    docker compose ps --format 'table {{.Name}}\t{{.Service}}\t{{.State}}\t{{.Publishers}}'

Services and default host ports:

    customer-web     http://127.0.0.1:3000
    backend          http://127.0.0.1:6733
    backend socket   http://127.0.0.1:6734
    tenant admin     http://127.0.0.1:3001
    platform admin   http://127.0.0.1:3100
    PostgreSQL       127.0.0.1:5433
    Redis            127.0.0.1:6379
    MinIO API        http://127.0.0.1:9000
    MinIO console    http://127.0.0.1:9001

If host port 6379 is already occupied, use an untracked compose override to
map the project Redis host port to 6380 while keeping the container port 6379.
Do not change backend REDIS_PORT; container-to-container traffic remains
redis:6379.

### 4.2 Infrastructure only

Use this for native backend/web development:

    cd e-com-nextjs
    docker compose -f docker-compose.infra.yml up -d
    docker compose -f docker-compose.infra.yml ps

Then configure ferio-nest-prisma/.env with:

    DATABASE_URL=postgresql://ferio:ferio@localhost:5433/ferio_dev
    PLATFORM_DATABASE_URL=postgresql://ferio:ferio@localhost:5433/ferio_platform
    REDIS_HOST=localhost
    REDIS_PORT=6379

### 4.3 Staging tunnel overlay

Use only after the trusted edge values are known:

    cd e-com-nextjs
    docker compose \
      --env-file .env.tunnel-staging.local \
      -f docker-compose.yml \
      -f docker-compose.tunnel-staging.yml \
      up -d --build backend customer-web

See cloudflare-tunnel-wildcard-staging.md for DNS, tunnel, proxy trust, and
browser isolation commands.

### 4.4 Production compose inspection

The production file is a hardened contract and is not a replacement for a
production orchestrator or managed provider:

    cd e-com-nextjs
    docker compose -f docker-compose.production.yml config
    docker compose -f docker-compose.production.yml config --services

Do not run production compose against real customer data without an approved
deployment, secret-management, backup, rollback, and security plan.

### 4.5 Logs and service inspection

    cd e-com-nextjs
    docker compose logs --tail=200 backend
    docker compose logs --tail=200 customer-web
    docker compose logs --tail=200 admin-web
    docker compose logs --tail=200 platform-admin
    docker compose logs --tail=200 postgres redis minio
    docker compose logs -f backend

    docker inspect ferio-backend
    docker inspect ferio-customer-web
    docker inspect ferio-postgres
    docker inspect ferio-redis
    docker network ls
    docker network inspect e-com-nextjs_default

### 4.6 Restart and rebuild

    cd e-com-nextjs
    docker compose restart backend
    docker compose restart customer-web admin-web platform-admin
    docker compose up -d --build backend
    docker compose up -d --build customer-web admin-web platform-admin

Do not use down -v during ordinary development. It deletes local database,
object-storage, secret, and Redis volumes.

## 5. Health and smoke checks

    curl -fsS http://127.0.0.1:6733/api/v1/health
    curl -i http://127.0.0.1:6733/api/v1/health
    curl -I http://127.0.0.1:3000/
    curl -I http://127.0.0.1:3001/
    curl -I http://127.0.0.1:3100/

Check the active OpenAPI document:

    curl -fsS http://127.0.0.1:6733/api/docs-json > /tmp/ferio-openapi-live.json
    node -e "const p=require('/tmp/ferio-openapi-live.json'); console.log(Object.keys(p.paths).length)"

For host-aware local tenant checks, replace the hostnames with active
TenantDomain values:

    curl -fsS \
      -H 'Host: audit-beta-20260911.ferio.local' \
      -H 'X-Forwarded-Host: audit-beta-20260911.ferio.local' \
      http://127.0.0.1:6733/api/v1/tenancy/status

    curl -fsS \
      -H 'Host: audit-gamma-20260911.ferio.local' \
      -H 'X-Forwarded-Host: audit-gamma-20260911.ferio.local' \
      http://127.0.0.1:6733/api/v1/tenancy/status

A missing or untrusted host must fail closed. Never interpret a default tenant
response as successful multi-tenant routing.

## 6. PostgreSQL commands

### 6.1 Container connectivity

    docker exec -it ferio-postgres pg_isready -U ferio
    docker exec -it ferio-postgres psql -U ferio -d ferio_dev -c 'select now();'
    docker exec -it ferio-postgres psql -U ferio -d ferio_platform -c 'select now();'

List databases, roles, and connections:

    docker exec -it ferio-postgres psql -U ferio -d postgres -c '\l'
    docker exec -it ferio-postgres psql -U ferio -d postgres -c '\du'
    docker exec -it ferio-postgres psql -U ferio -d postgres -c \
      'select datname, numbackends from pg_stat_database order by datname;'

From the host, if psql is installed:

    PGPASSWORD=ferio psql -h 127.0.0.1 -p 5433 -U ferio -d ferio_dev
    PGPASSWORD=ferio psql -h 127.0.0.1 -p 5433 -U ferio -d ferio_platform

### 6.2 Tenant database inspection

Tenant database names and credentials are control-plane data. Discover names
through the supported platform/admin flow or a controlled read-only query; do
not print credential material into logs.

    docker exec -it ferio-postgres psql -U ferio -d ferio_platform -c \
      'select id, slug, status from "Organization" order by "createdAt" desc;'

    docker exec -it ferio-postgres psql -U ferio -d ferio_platform -c \
      'select "organizationId", "databaseName", status, "lastHealthyAt" from "TenantDatabase";'

Then inspect a disposable tenant database with its tenant role:

    docker exec -it ferio-postgres psql -U <TENANT_ROLE> -d <TENANT_DATABASE> \
      -c '\dt'

Never connect a tenant request to the control-plane database and never select a
tenant database from a client-supplied database name.

### 6.3 Local dumps and restore drills

Create a disposable control-plane dump:

    mkdir -p /tmp/ferio-db-dumps
    docker exec ferio-postgres pg_dump -U ferio -Fc ferio_platform \
      > /tmp/ferio-db-dumps/ferio_platform.dump

Create a disposable tenant dump:

    docker exec ferio-postgres pg_dump -U <TENANT_ROLE> -Fc <TENANT_DATABASE> \
      > /tmp/ferio-db-dumps/<TENANT_DATABASE>.dump

Restore only into a disposable database:

    docker exec -it ferio-postgres createdb -U ferio restore_drill_20260911
    cat /tmp/ferio-db-dumps/<TENANT_DATABASE>.dump | \
      docker exec -i ferio-postgres pg_restore -U ferio \
        -d restore_drill_20260911 --no-owner --exit-on-error

Validate the restored schema and row counts, then remove only the disposable
database after evidence is captured:

    docker exec -it ferio-postgres psql -U ferio -d restore_drill_20260911 \
      -c '\dt'
    docker exec -it ferio-postgres dropdb -U ferio restore_drill_20260911

This is local application recovery evidence, not managed PITR evidence.

## 7. Prisma commands

Run backend Prisma commands from e-com-nextjs/ferio-nest-prisma.

### 7.1 Schema and client

    cd e-com-nextjs/ferio-nest-prisma
    pnpm run prisma:schema:build
    pnpm run prisma:generate
    pnpm run prisma:generate:platform
    pnpm run prisma:sync
    pnpm exec prisma validate --schema prisma/schema.prisma
    pnpm exec prisma validate --schema prisma/platform.prisma
    pnpm exec prisma format --schema prisma/schema.prisma
    pnpm exec prisma format --schema prisma/platform.prisma

prisma:sync rebuilds the composed schema and generates both clients. Run it
after source Prisma schema changes and before migration work.

### 7.2 Migrations

Tenant database migration status:

    pnpm run prisma:migrate:status

Apply tenant migrations:

    pnpm run prisma:migrate:deploy

Apply platform/control-plane migrations:

    pnpm run prisma:migrate:platform

Development migration for an intentional schema change:

    pnpm run prisma:migrate:dev -- --name <short_change_name>

Do not use migrate dev against shared staging or production databases. Review the
generated SQL, migration ordering, compatibility, and rollback plan first.

Seed local data:

    pnpm run prisma:seed

Run the repository migration and integrity gates:

    pnpm run check:migrations
    pnpm run check:migration-compatibility

### 7.3 Prisma investigation commands

    pnpm exec prisma migrate status --schema prisma/schema.prisma
    pnpm exec prisma migrate diff \
      --from-schema-datamodel prisma/schema.prisma \
      --to-url "$DATABASE_URL" \
      --script
    pnpm exec prisma db pull --schema prisma/schema.prisma

Use db pull and migrate diff for investigation only. Do not overwrite the
source schema or migration history without review.

### 7.4 Tenant provisioning utilities

The supported provisioning service owns tenant database creation, credentials,
migrations, seed, health, smoke, and activation. Do not manually mark an
organization active after a partial run.

Before provisioning evidence:

    pnpm run verify:domain-readiness

For controlled tenant export utilities:

    pnpm run tenant:export
    pnpm run tenant:export:media

Review the script help and environment requirements before exporting any real
tenant. Store exports outside Git with restricted permissions.

## 8. Backend quality gates and tests

    cd e-com-nextjs/ferio-nest-prisma

    pnpm run build
    pnpm run lint
    pnpm run lint:strict:src
    pnpm run typecheck:application
    pnpm run architecture:check
    pnpm run check:tenant-context-boundaries
    pnpm run check:connection-budget
    pnpm run check:tenant-edge-policy
    pnpm run check:backup-policy
    pnpm run check:upload-security
    pnpm run openapi:check

Tests:

    pnpm run test
    pnpm run test:watch
    pnpm run test:cov
    pnpm run test:e2e
    pnpm run test:integration
    pnpm run test:integration:local
    pnpm run test:performance
    pnpm run test:http-capacity
    pnpm run test:queue-smoke

Run one Jest file or name pattern:

    pnpm exec jest src/tenancy/tests/tenant-resolver.service.spec.ts --runInBand
    pnpm exec jest --runInBand -t 'tenant isolation'

The local integration runner provisions or uses disposable test resources. Read
its script and env requirements before running it against any non-test database.

## 9. OpenAPI and frontend contract commands

Export the backend contract:

    cd e-com-nextjs/ferio-nest-prisma
    pnpm run openapi:export
    pnpm run openapi:check

When Docker Redis is published on host port 6380 because host port 6379 is
occupied, run the check with the project port explicitly:

    REDIS_HOST=127.0.0.1 REDIS_PORT=6380 pnpm run openapi:check

The command must terminate successfully. A process that stays alive after
writing the OpenAPI file is not a passing result; bound it with timeout, inspect
Redis connection/shutdown logs, and record the result rather than ignoring it.

Regenerate and verify customer web:

    cd ../ferio-customer-web
    pnpm run api:codegen
    pnpm run api:check
    pnpm exec tsc --noEmit
    pnpm lint
    pnpm build

Regenerate and verify tenant admin:

    cd ../ferio-admin-dashboard/ferio-admin
    pnpm run api:codegen
    pnpm run api:check
    pnpm exec tsc --noEmit
    pnpm lint
    pnpm build

Regenerate and verify platform admin:

    cd ../../ferio-platform-admin
    pnpm run api:codegen
    pnpm run api:check
    pnpm exec tsc --noEmit
    pnpm lint
    pnpm build

The codegen command overwrites lib/api-schema.ts. Review the diff and run the
matching api:check before committing it.

## 10. Native web development

Customer web:

    cd e-com-nextjs/ferio-customer-web
    pnpm dev
    pnpm dev -- --hostname 0.0.0.0
    pnpm start

Tenant admin:

    cd ../ferio-admin-dashboard/ferio-admin
    pnpm dev
    pnpm start

Platform admin:

    cd ../../ferio-platform-admin
    pnpm dev
    pnpm start

Native apps must point to the backend URL reachable from the browser/runtime.
Server-side Next requests should use FERIO_API_URL or the equivalent internal
service URL; browser requests should use the public API URL.

## 11. Redis and BullMQ

Container health:

    docker exec -it ferio-redis redis-cli ping
    docker exec -it ferio-redis redis-cli INFO server
    docker exec -it ferio-redis redis-cli DBSIZE
    docker exec -it ferio-redis redis-cli --scan --pattern 'ferio:*' | head

Use a disposable namespaced key for a smoke check:

    docker exec -it ferio-redis redis-cli SET ferio:smoke:command ok EX 60
    docker exec -it ferio-redis redis-cli GET ferio:smoke:command
    docker exec -it ferio-redis redis-cli TTL ferio:smoke:command
    docker exec -it ferio-redis redis-cli DEL ferio:smoke:command

Run queue tests:

    cd e-com-nextjs/ferio-nest-prisma
    pnpm run test:queue-smoke

Do not flush Redis in a shared environment. Never use redis-cli FLUSHALL or
FLUSHDB unless an approved disposable environment and explicit destructive
change window exist.

## 12. MinIO and object storage

Check MinIO containers and the local media bucket:

    docker exec -it ferio-minio mc ready local
    docker exec -it ferio-minio mc alias list
    docker exec -it ferio-minio mc ls local
    docker exec -it ferio-minio mc ls local/ferio-media

The init job creates ferio-media. Storage smoke test:

    cd e-com-nextjs/ferio-nest-prisma
    pnpm run storage:smoke

Keep uploaded test objects tenant-namespaced and remove only disposable
objects after recording evidence. Local MinIO is not proof of Cloudflare R2
malware quarantine or production retention.

## 13. API and browser smoke checks

Backend health:

    curl -fsS http://127.0.0.1:6733/api/v1/health

Customer SSR:

    curl -fsS -o /tmp/customer.html \
      -w 'HTTP %{http_code}\n' http://127.0.0.1:3000/

Tenant-admin SSR:

    curl -fsS -o /tmp/admin.html \
      -w 'HTTP %{http_code}\n' http://127.0.0.1:3001/

Platform-admin auth boundary:

    curl -sS -D /tmp/platform.headers -o /dev/null \
      http://127.0.0.1:3100/

Local host-aware status using separate output files:

    curl -fsS -H 'Host: <TENANT_A_HOST>' \
      -H 'X-Forwarded-Host: <TENANT_A_HOST>' \
      http://127.0.0.1:6733/api/v1/tenancy/status \
      > /tmp/tenant-a-status.json

    curl -fsS -H 'Host: <TENANT_B_HOST>' \
      -H 'X-Forwarded-Host: <TENANT_B_HOST>' \
      http://127.0.0.1:6733/api/v1/tenancy/status \
      > /tmp/tenant-b-status.json

For public wildcard, TLS, SSR, cookie, cart, checkout, and cross-tenant browser
commands, use cloudflare-tunnel-wildcard-staging.md. Local curl is not a
replacement for two isolated browser profiles.

## 14. Database and port troubleshooting

List listeners:

    ss -ltnp
    lsof -nP -iTCP:3000 -sTCP:LISTEN
    lsof -nP -iTCP:6733 -sTCP:LISTEN
    lsof -nP -iTCP:5433 -sTCP:LISTEN
    lsof -nP -iTCP:6379 -sTCP:LISTEN

Inspect container health:

    docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
    docker inspect --format '{{json .State.Health}}' ferio-postgres
    docker inspect --format '{{json .State.Health}}' ferio-redis
    docker inspect --format '{{json .State.Health}}' ferio-backend

Enter service shells:

    docker exec -it ferio-backend sh
    docker exec -it ferio-customer-web sh
    docker exec -it ferio-postgres sh
    docker exec -it ferio-redis sh

If a host port is occupied, identify the owning process first. Change only the
host-side mapping in an untracked compose override; do not change internal
service ports used by Docker-to-Docker connections.

## 15. Safe cleanup

Stop applications but retain data:

    cd e-com-nextjs
    docker compose stop

Remove containers but retain named volumes:

    docker compose down

Remove containers and volumes only in a disposable local environment:

    docker compose down -v

Remove only stopped images/build cache when intentionally reclaiming disk:

    docker image prune
    docker builder prune

Do not run system-wide prune commands on a shared development machine without
reviewing what will be deleted. Never remove the persistent ferio_secrets
volume casually; encrypted tenant credentials may become undecryptable after
secret loss.

## 16. Recommended change workflow

For backend schema or API changes:

1. Change source schema/controller/DTO.
2. Run prisma:sync and generate migration deliberately.
3. Review migration SQL and run migration compatibility checks.
4. Apply tenant and platform migrations to disposable local databases.
5. Export OpenAPI.
6. Run api:codegen and api:check in all three web workspaces.
7. Run backend architecture, lint, typecheck, and focused tests.
8. Run all relevant web typecheck, lint, and build commands.
9. Run Docker health and host-aware smoke checks.
10. Record evidence and review git diff before commit.

Final local diff checks:

    git diff --check
    git status --short
    git diff --stat

Do not mark live Cloudflare, managed backup/PITR, external provider delivery,
pilot operation, or formal security acceptance complete from local commands.
