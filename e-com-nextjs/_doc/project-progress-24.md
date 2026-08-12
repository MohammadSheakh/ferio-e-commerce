# Ferio Project Progress 24

**Checkpoint date:** August 11, 2026  
**Milestone:** Release 1 — BullMQ runtime and reconciliation observability  
**Status:** Reconciliation scheduling and retries are proven against isolated Redis, with operational metrics derived from durable PostgreSQL runs

## Delivered

### Isolated BullMQ runtime harness

- Added a separate `pnpm run test:queue-smoke` Jest configuration that is excluded from normal unit and PostgreSQL integration suites.
- Requires a non-default Redis port and a queue prefix beginning with `ferio:test:` so the suite cannot use normal application queue keys.
- Starts from an empty isolated namespace and removes the scheduler, jobs, and keys after execution.
- Documented the smoke command and the supported Redis 6.2-or-newer requirement.

### Scheduler and worker proof

- Proves scheduler registration and the first scheduled occurrence entering the waiting queue.
- Runs the real BullMQ worker through the feature-owned reconciliation processor.
- Intentionally fails the first scheduled execution and proves BullMQ retry/backoff completes the same job on the second attempt.
- Verifies the next scheduler occurrence is delayed with a future execution time.
- Enqueues and processes an operator retry with the deterministic durable-run attempt job ID.

### Durable observability

- Applied `QUEUE_PREFIX` to the reconciliation queue registration.
- Added PostgreSQL-derived 24-hour completion count, failure count, success rate, average duration, last success, and last failure.
- Added the metrics to the existing Admin reconciliation operations strip using restrained typography and semantic status color.
- Changed operational run reads to an explicit safe projection so idempotency hashes are never returned through queue-health responses.

## Validation

| Project | Check | Result |
| --- | --- | --- |
| Backend | Isolated Redis BullMQ smoke | Passed; 1 suite and 3 tests |
| Backend | Full unit tests | Passed; 19 suites and 67 tests |
| Backend | Focused metrics and queue tests after safe projection | Passed; 2 suites and 9 tests |
| Backend | Production build including shared libraries | Passed |
| Admin Web | Production build and type checking | Passed; 40 pages/routes generated |
| Infrastructure | Redis test namespace cleanup | Passed; zero keys before shutdown |

## Runtime Note

- The available local Redis was version 6.0.16 and completed the smoke flow, but BullMQ 5 reports that Redis 6.2 or newer is the supported minimum.
- Staging and production must use Redis 6.2 or newer; the backend README and environment example now state this requirement.

## Still Open

- A combined full API stack using isolated PostgreSQL and Redis remains pending.
- Queue metrics currently cover reconciliation only; request, database, commerce, provider, backup, and alerting metrics remain pending.
- Concurrent stock reservation, stock adjustment, order confirmation, and settlement PostgreSQL integration cases remain pending.
- Courier provider sandbox callbacks and report imports remain pending.
- Prepaid-provider comparison remains blocked by the payment-provider decision and adapter.

## Recommended Next Work

1. Add PostgreSQL integration fixtures for a confirmable COD order and finite inventory balance.
2. Race two order-confirmation commands and prove only one reservation and one stock effect are committed.
3. Verify insufficient-stock rollback leaves the order and inventory ledger unchanged.
4. Extend integration coverage to concurrent manual stock adjustment after reservation behavior is proven.
