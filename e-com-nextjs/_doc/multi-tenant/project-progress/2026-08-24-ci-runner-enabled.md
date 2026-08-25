# Project Progress — CI Runner Enabled: Cross-Tenant Suites on Every Push

**Date:** August 24, 2026 (seventeenth increment)
**Scope:** The single highest-leverage enablement item — the gated integration suites now execute against real disposable infrastructure on every push. MT-13 §16.4 "tenant-isolation integration suite mandatory in CI" is satisfied.

---

## What changed

### `.github/workflows/ci.yml` — backend job upgraded

**Service containers** (exist only for the job run, destroyed after):

| Service | Image | Purpose |
|---|---|---|
| `postgres:16` | port 5432, superuser | Disposable server for scratch tenant databases (superuser ⇒ CREATE DATABASE rights the isolation suite requires) |
| `redis:7` | host port **6380** → container 6379 | BullMQ runtime for queue smoke tests |

Both have health checks; steps wait until ready.

**New env:**
- `TEST_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/postgres` — satisfies every `TEST_DATABASE_URL` gate
- `TEST_REDIS_PORT=6380`, `TEST_QUEUE_PREFIX=ferio:test:ci` — satisfies the smoke specs' deliberate guards (non-default port + `ferio:test:` prefix so CI can never touch production queues)

**New steps:**
1. `Strict typecheck (incl. specs)` — cacheless tsc, zero-tolerance
2. `Cross-tenant isolation + bootstrap integration tests` (`pnpm test:integration`) — runs all seven gated suites including:
   - canonical migration chain applied to fresh databases + idempotency
   - baseline exactly-once seeding
   - two-database isolation with deliberately colliding brand/product IDs
   - product-level publish-filter proof across tenants
3. `BullMQ runtime smoke tests` (`pnpm test:queue-smoke`) — scheduler registration, retry/backoff, worker delivery against real Redis

Also: strict typecheck step added before unit tests (was backend-only previously).

## What this now catches automatically

Every push verifies, against real PostgreSQL:
- oversell prevention under concurrent confirmation,
- settlement replay/idempotency and quarantine behavior,
- purchase-activity eligibility rules,
- **two independently bootstrapped tenant databases cannot read each other's rows even with identical identifiers**, and a published-vs-draft cross-tenant product lookup returns nothing,
- BullMQ schedulers register, retries back off, workers deliver.

The exact regression classes that made the single-tenant codebase's checklist claims unverifiable are now mechanically enforced.

## Notes

- Queue-smoke's non-default-port guard is intentional design: it makes it impossible to point these destructive tests at production Redis by accident.
- Local machines still skip the integration suite when `TEST_DATABASE_URL` is unset — unchanged developer experience.
- Branch protection recommendation: require the `backend`, `customer-web`, `admin-web`, and `platform-admin` checks to pass before merging into `main`.

## Remaining program items (all owner-gated)

Hosting model · wildcard DNS/TLS · plan catalog pricing · credential-vault storage · retention windows · pilot businesses.
