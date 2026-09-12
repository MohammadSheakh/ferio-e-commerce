# Local PostgreSQL Internal-Alpha Evidence

Date: 2026-09-10

## Environment

- PostgreSQL: local Docker `postgres:16`, host port `5433`
- Test database: `ferio_dev`
- Tenant database credentials: supplied through the test environment only;
  no connection string or password is stored in this evidence
- Redis: not used or changed by these tests
- Public Cloudflare Tunnel: not running in the coding environment; no live DNS
  or HTTPS claim is made here

## Results

### Two-tenant vertical

Command:

```sh
TEST_DATABASE_URL='postgresql://<operator-secret>@localhost:5433/ferio_dev' \
  pnpm exec jest --config ./test/jest-integration.json --runInBand \
  --runTestsByPath test/two-tenant-vertical.integration-spec.ts \
  --verbose --detectOpenHandles
```

Result: **1 suite passed, 1 test passed, 8.739 seconds**.

The suite created two disposable tenant databases, applied the canonical 50
migrations, and verified the vertical tenant boundary using intentionally
overlapping identifiers. Scratch databases were removed by the suite.

### Tenant bootstrap fleet

Command:

```sh
TEST_DATABASE_URL='postgresql://<operator-secret>@localhost:5433/ferio_dev' \
  pnpm exec jest --config ./test/jest-integration.json --runInBand \
  --runTestsByPath test/tenant-bootstrap.integration-spec.ts \
  --verbose --detectOpenHandles
```

Result: **1 suite passed, 4 tests passed, 23.512 seconds**.

The suite exercised concurrent disposable tenant database creation, canonical
schema bootstrap/readiness, and cleanup. Each successful tenant reported the
same schema head:
`20260908193000_tenant_messaging_provider_configs`.

## Interpretation

These results support the Release 1 internal-alpha provisioning and isolation
controls against local Docker PostgreSQL. They do not prove Cloudflare DNS/TLS,
SSR/BFF behavior over public hostnames, managed hosting/failover/PITR, queue
fairness, provider delivery, or real-business pilot readiness. Those require
the operator environment and remain open in the implementation checklist.
