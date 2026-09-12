# Command Reference Validation — Shot 22

Date: 2026-09-11

## Scope

Execute the new senior development and operations command reference against
the current local Docker stack without destructive cleanup.

## Passed evidence

- All Docker services were running: PostgreSQL, Redis, MinIO, NestJS backend,
  customer web, tenant admin, and platform admin.
- Backend health returned HTTP 200.
- PostgreSQL accepted connections and the platform database returned `1`.
- Project Redis returned `PONG`.
- MinIO reported the local cluster ready.
- Migration validation passed for 57 migration directories across both roots.
- Migration integrity passed for all 57 committed artifacts.
- Migration compatibility passed for the two post-baseline artifacts.
- Tenant-context boundary validation passed for 12 inventoried entry points.
- Architecture boundary validation passed.
- Customer, tenant-admin, and platform-admin `pnpm run api:check` passed from
  their correct workspace directories.

## Inconclusive gate

`pnpm run openapi:check` did not terminate within a 20-second bound when the
host environment targeted Redis at `127.0.0.1:6379`; logs showed Redis
connection errors and the command exited by timeout. The same check targeted
at the project Redis host port `6380` also remained alive for a 40-second bound
and exited by timeout.

This is not recorded as an OpenAPI mismatch. The checked-in frontend schemas
still match `openapi.json`, but backend OpenAPI export lifecycle/shutdown must
be isolated and corrected before this gate can be marked passed. The run also
emitted a Redis 6.0.16 compatibility warning from the host environment; the
Docker service is Redis 7.

## Environment notes

- Web package commands emitted the repository engine warning because this host
  uses Node 24 while those packages declare Node 20.
- The project Redis host port is 6380 in this runtime because host port 6379 is
  already occupied. Container-to-container Redis remains `redis:6379`.
- No destructive command, volume removal, schema mutation, or code change was
  performed in this shot.

## Next action

Investigate the backend OpenAPI export shutdown path under the supported Node 20
runtime and project Redis configuration. Then rerun the bounded gate and only
after it exits successfully proceed to public Cloudflare browser isolation.

