# Live API Smoke Shot 22

Date: 2026-09-11

## Scope

Attempted the repository's guarded local integration runner for backend-backed
API evidence. The runner loads `ferio-nest-prisma/.env`, requires the separate
`TEST_DATABASE_URL`, refuses non-test database names, deploys the canonical
migrations to that database, and then runs the integration suite.

## Configuration observed

- `DATABASE_URL` targets the development database `ferio_dev`.
- `PLATFORM_DATABASE_URL` targets the control-plane database `ferio_platform`.
- `TEST_DATABASE_URL` targets the disposable test database `ferio_test_runner`.
- The test target is separate from both application databases.

## Result

Command:

```text
pnpm test:integration:local
```

The sandbox first rejected localhost networking with `EPERM`. The same command
was then rerun with the required local-service permission and failed before
tests or migrations because PostgreSQL was unavailable:

```text
connect ECONNREFUSED 127.0.0.1:5433
```

No integration assertion result is claimed. The failure is an environment
availability blocker, not a passing or failing API contract result.

## Safety boundary

The runner was pointed at `ferio_test_runner` only. No development or platform
database was used, no Redis implementation/configuration was changed, and the
mobile project was not touched.

## Next runtime prerequisite

Start the local Docker PostgreSQL service exposing port `5433`, verify that
`ferio_test_runner` is disposable and has `CREATE DATABASE` permission, then
rerun the guarded integration suite before claiming live cross-tenant or
end-to-end API evidence.
