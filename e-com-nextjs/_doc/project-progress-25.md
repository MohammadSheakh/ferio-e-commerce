# Ferio Project Progress 25

**Checkpoint date:** August 11, 2026  
**Milestone:** Release 1 — Concurrent COD confirmation safety  
**Status:** PostgreSQL now proves two orders cannot oversell the same finite stock and insufficient stock leaves no partial confirmation evidence

## Delivered

### Confirmable order fixtures

- Added guarded PostgreSQL integration fixtures for customer, cart, checkout draft, immutable order address, immutable order item, product variant, warehouse, and finite inventory.
- Instantiates the real order, audit, and transactional messaging services without booting unrelated HTTP or Redis infrastructure.
- Runs only through the existing test-database name guard and the isolated `TEST_DATABASE_URL` command.

### Concurrent reservation proof

- Races two different pending COD orders that each require the entire available stock balance.
- Proves exactly one confirmation succeeds and the competing command returns a domain conflict.
- Proves stock is reserved once, with one active reservation and one immutable `RESERVE` movement.
- Proves only the winning order receives confirmed status, fulfillment readiness, status history, fulfillment history, audit evidence, and one transactional outbox message.
- Proves the losing order remains pending without inventory or workflow side effects.

### Insufficient-stock rollback

- Attempts to confirm an order whose requested quantity exceeds total available stock.
- Proves the order remains pending, unfulfilled, unverified, and without a confirmation timestamp.
- Proves reserved stock remains zero and no reservation, movement, confirmation history, audit record, or outbox message is committed.

## Validation

| Project | Check | Result |
| --- | --- | --- |
| Backend | Full migration deploy to disposable PostgreSQL | Passed; 17 of 17 migrations |
| Backend | PostgreSQL integration suites | Passed; 2 suites and 6 tests |
| Backend | Concurrent order confirmation | Passed; one success, one conflict, no oversell |
| Backend | Insufficient-stock rollback | Passed; zero partial side effects |
| Backend | Full unit tests | Passed; 19 suites and 67 tests |
| Backend | Production build including shared libraries | Passed |
| Infrastructure | Disposable database cleanup | Passed; test database removed |

## Still Open

- Duplicate COD placement idempotency still needs PostgreSQL integration proof.
- Cancellation-time reservation release and movement rollback need PostgreSQL integration proof.
- Concurrent manual stock adjustment against active reservations remains pending.
- Order confirmation currently returns a retryable conflict for the losing concurrent command rather than automatically retrying an operation that is no longer valid.
- Provider sandbox, prepaid payment, and combined full-stack tests remain pending.

## Recommended Next Work

1. Confirm an order, cancel it, and prove the active reservation becomes released with one inverse movement and restored available stock.
2. Race cancellation or stock adjustment with another inventory command and verify serializable conflict handling.
3. Add duplicate COD placement integration using the same idempotency key and prove one order snapshot and one placed-message record.
4. Keep broader fulfillment and provider tests separate until reservation release behavior is proven.
