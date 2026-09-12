# OpenAPI Export Shutdown Fix — Shot 23

Date: 2026-09-11

## Problem

The backend `openapi:check` command generated the contract but stayed alive
because Redis and queue-owned sockets remained after Nest application shutdown.
The command therefore timed out even though the generated schema matched the
checked-in contract.

## Correction

- Added `RedisClientsLifecycle` to own and disconnect the three raw ioredis
  clients during normal Nest module shutdown.
- Added focused lifecycle regression coverage for all clients and optional
  failed-to-initialize clients.
- Made the one-shot `OPENAPI_EXPORT=1` path exit explicitly with success only
  after `app.close()` completes. This is scoped to the CLI export path and does
  not force-exit the long-running API server.
- Added command-reference guidance for the project Redis host port when host
  port 6379 is occupied.

## Verification

- Focused lifecycle Jest suite: 1 suite, 2 tests passed.
- Backend application typecheck passed.
- Changed-file ESLint passed.
- `REDIS_HOST=127.0.0.1 REDIS_PORT=6380 pnpm run openapi:check` passed and
  terminated successfully.

The existing full strict-source lint still has an unrelated pre-existing
unsafe assignment in `src/features/delivery-personnel/tests/
delivery-personnel.tenant-isolation.spec.ts`; it was not changed in this shot.

