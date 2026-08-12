# Ferio Project Progress 22

**Checkpoint date:** August 11, 2026  
**Milestone:** Release 1 — Scheduled reconciliation operations  
**Status:** BullMQ can schedule and retry cross-domain reconciliation while PostgreSQL remains the durable source of run and failure evidence

## Delivered

### Durable reconciliation runs

- Extended reconciliation runs with manual, scheduled, and retry triggers, nullable system initiators, BullMQ job IDs, attempt counts, and last-attempt timing.
- Moved run creation and failure updates outside the scan transaction so a rolled-back scan still leaves a durable failed run and reason.
- Reuses the same durable run across automatic and operator retries instead of creating duplicate operational evidence.
- Added an unapplied migration for the new trigger enum, queue metadata, retry counters, nullable actor, and operational index.

### BullMQ scheduling and processing

- Registered a dedicated reconciliation queue with three attempts, exponential backoff, and bounded completed and failed history.
- Added a feature-owned BullMQ worker that routes scheduled jobs and explicit retries into the existing reconciliation service.
- Added a stable BullMQ job scheduler with configurable interval and overdue threshold.
- Keeps scheduling disabled by default until `RECONCILIATION_SCHEDULE_ENABLED=true` is intentionally configured.
- Uses deterministic retry job IDs per durable run attempt to deduplicate repeated operator clicks.

### Operations and Admin Web

- Added protected queue-health and failed-run retry endpoints.
- Queue health combines Redis delivery state with recent PostgreSQL runs rather than treating Redis as financial or operational truth.
- Added Admin BFF routes for health and retry.
- Added a restrained operations strip showing queue availability, schedule state, next execution, waiting, active, delayed, and failed counts.
- Added failed-run reason and attempt visibility with an operator retry action.

## Validation

| Project | Check | Result |
| --- | --- | --- |
| Backend | Prisma modular schema build and client generation | Passed; 37 schema fragments |
| Backend | Focused reconciliation queue, processor, and service tests | Passed; 3 suites and 10 tests |
| Backend | Full unit tests | Passed; 19 suites and 66 tests |
| Backend | Production build including shared libraries | Passed |
| Admin Web | Production build and type checking | Passed; 40 pages/routes generated |

## Still Open

- New and earlier migrations remain unapplied to disposable or live PostgreSQL.
- Redis scheduler registration and worker execution have unit coverage but still require a running Redis staging smoke test.
- Scheduling is configuration-gated and intentionally disabled by default.
- Seeded inconsistency, database transaction, concurrent scan, and browser end-to-end tests remain pending.
- Prepaid-provider record comparison remains blocked by the production payment-provider decision and adapter.
- Provider report import, unmatched external records, and automated dispute correction remain pending.

## Recommended Next Work

1. Apply the full migration chain to disposable PostgreSQL and seed known inventory, COD, settlement, and refund inconsistencies.
2. Run concurrent scans to verify unique idempotency, finding upserts, auto-resolution, and failed-run durability against PostgreSQL.
3. Start Redis with scheduling enabled in a staging configuration and observe delayed creation, processing, retry, and Admin health state.
4. Add request, database, queue, commerce, and provider metrics after the runtime behavior is proven.
