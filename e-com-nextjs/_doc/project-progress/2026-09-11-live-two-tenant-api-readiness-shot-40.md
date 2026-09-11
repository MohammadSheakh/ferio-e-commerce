# Live two-tenant API readiness shot 40

Date: 2026-09-11

## Scope

Attempted the next runtime proof for two-tenant API integration, including the
disposable PostgreSQL-backed integration harness, local NestJS API, customer
web, and tenant-admin web endpoints. Redis was not started, changed, or
inspected beyond avoiding it.

## Results

- The configured test database is present in `ferio-nest-prisma/.env` as
  `TEST_DATABASE_URL=postgresql://ferio:ferio@localhost:5433/ferio_test_runner`.
- PostgreSQL on `127.0.0.1:5433` did not respond to readiness probing.
- The escalated `pnpm test:integration:local` bootstrap failed before
  migrations/tests with `ECONNREFUSED 127.0.0.1:5433`.
- Docker inspection could not access the local Docker runtime socket in this
  environment.
- Local HTTP readiness also failed: API `6733`, customer web `3000`, and
  tenant-admin web `3001` were not listening.

## Evidence boundary

No live API, SSR/BFF, cookie, two-tenant isolation, cross-tenant denial,
assignment race, callback, or browser evidence is claimed. Static API checks
and focused unit tests remain valid but cannot replace this runtime proof.

## Next prerequisite

Start the disposable PostgreSQL Docker service on port `5433`, then bring up
the NestJS/customer/tenant-admin processes and rerun the local integration
harness before recording MT-13/MT-14 runtime completion.
