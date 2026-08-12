# Ferio Project Progress 29

**Checkpoint date:** August 11, 2026  
**Milestone:** Release 1 — Auto-confirm COD placement safety  
**Status:** Concurrent auto-confirm COD placement now creates one confirmed order with one immediate reservation, while insufficient stock leaves the cart and all downstream records untouched

## Delivered

### Configurable placement fixtures

- Extended the real cart and checkout fixture with configurable COD verification mode, stock quantity, cart quantity, SKU, image, phone, warehouse, and calculated totals.
- Keeps every fixture isolated through suffix-specific unique values.
- Exercises the real cart validation, checkout revalidation, order conversion, reservation, audit, and transactional messaging services.

### Auto-confirm concurrency proof

- Sets COD verification mode to `NEVER` and races two placement calls with the same cart token and idempotency key.
- Proves both callers receive the same order ID.
- Proves the order is immediately `CONFIRMED`, fulfillment-ready, verification-not-required, and timestamped during conversion.
- Proves stock reserves once with one active reservation and one immutable `RESERVE` movement.
- Proves one customer confirmation history, one system fulfillment history, and one placement audit.
- Proves one `ORDER_PLACED` and one `ORDER_CONFIRMED` outbox message despite concurrent responses and later replay.
- Replays after cart conversion and verifies reservation, movement, audit, and message counts remain singular.

### Insufficient-stock safety

- Creates an otherwise valid auto-confirm cart whose quantity exceeds available stock.
- Proves placement returns a domain conflict before conversion.
- Proves the cart remains active, stock remains unreserved, and no customer, order, movement, placement audit, or recipient message is created.

## Validation

| Project | Check | Result |
| --- | --- | --- |
| Backend | Full migration deploy to disposable PostgreSQL | Passed; 17 of 17 migrations |
| Backend | PostgreSQL integration suites | Passed; 2 suites and 12 tests |
| Backend | Concurrent auto-confirm replay | Passed; one order, reservation, movement, and message pair |
| Backend | Insufficient-stock placement | Passed; zero downstream side effects |
| Backend | Full unit tests | Passed; 19 suites and 67 tests |
| Backend | Production build including shared libraries | Passed |
| Infrastructure | Disposable database cleanup | Passed; test database removed |

## Still Open

- `ABOVE_AMOUNT` threshold boundaries need focused database integration if the policy is used at launch.
- Courier settlement recording and provider report concurrency remain pending.
- Combined Customer Web, Admin Web, API, PostgreSQL, and Redis end-to-end execution remains pending.
- Provider sandbox callbacks and report imports remain pending.
- Prepaid payment work remains blocked by the provider decision and adapter.

## Recommended Next Work

1. Seed delivered COD collections eligible for one courier settlement batch.
2. Race duplicate settlement commands and prove one settlement, item set, collection transition, audit record, and financial variance result.
3. Race overlapping settlement batches that claim the same collection and prove no collection is settled twice.
4. Add provider report import only after internal settlement command concurrency is proven.
