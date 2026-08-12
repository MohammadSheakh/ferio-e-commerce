# Ferio Project Progress 21

**Checkpoint date:** August 11, 2026  
**Milestone:** Release 1 — Persistent reconciliation findings  
**Status:** Staff can run idempotent cross-domain scans and investigate durable findings with severity, age, ownership, evidence, and audited resolution

## Delivered

### Reconciliation data model

- Added persistent reconciliation findings with domain, normalized type, severity, status, title, description, related entity, and JSON evidence.
- Added stable fingerprints, recurrence counts, first-detected and last-seen timestamps, owner, acknowledgement, and resolution evidence.
- Added durable scan runs with idempotency key, threshold, counts, initiating actor, timing, and completion status.
- Added an unapplied migration with enums, records, uniqueness constraints, and operational indexes.

### Cross-domain scans

- Detects delivered COD shipments missing a collection expectation.
- Detects overdue COD collections, RTO shipments with positive collection, COD amount variance, and courier bank-remittance variance.
- Detects collected COD whose order payment state is inconsistent and paid COD without settlement evidence.
- Detects active inventory reservations on terminal orders and impossible stock balances.
- Detects refunds pending beyond the configured threshold.
- Upserts findings idempotently, increments recurrence, reopens recurring resolved findings, preserves active acknowledgement, and auto-resolves conditions no longer detected.

### Investigation workflow

- Added protected list, scan, and finding-action endpoints plus Admin BFF routes.
- Added filters for status, domain, and severity with open, acknowledged, and resolved counts.
- Added severity, age, recurrence, owner, context-aware order drill-down, acknowledgement, resolution, reopening, and claim actions.
- Audits completed scans and every finding action with actor, before/after value, and required note.
- Kept scan domain logic independent from triggering so Admin, BullMQ, or an external scheduler can call the same implementation safely.

## Validation

| Project | Check | Result |
| --- | --- | --- |
| Backend | Prisma schema build and validation | Passed; 37 schema fragments |
| Backend | Focused reconciliation tests | Passed; 1 suite and 3 tests |
| Backend | Full unit tests | Passed; 17 suites and 59 tests |
| Backend | Production build | Passed |
| Admin Web | Production build | Passed; 39 pages/routes generated |

## Still Open

- New and earlier migrations remain unapplied to disposable or live PostgreSQL.
- Scans are manually triggered; BullMQ repeatable scheduling, retry policy, and failed-job inspection are not connected yet.
- Prepaid-provider record comparison remains blocked by the production payment-provider decision and adapter.
- Provider report import, unmatched external records, and automated dispute correction remain pending.
- Database integration, concurrent scan, seeded inconsistency, browser, and end-to-end reconciliation tests remain.
- Queue ownership is actor-ID based; staff directory labels and permission-specific assignment remain pending.

## Recommended Next Work

1. Register a dedicated BullMQ reconciliation queue and processor that calls the same idempotent scan service.
2. Add repeatable scheduling, retry/backoff, deterministic scheduler keys, and failed-job visibility.
3. Expose last scheduled run, next run, queue health, and manual retry without making Redis the source of truth.
4. Apply the migration chain to disposable PostgreSQL and seed known inconsistencies to verify findings and auto-resolution.
