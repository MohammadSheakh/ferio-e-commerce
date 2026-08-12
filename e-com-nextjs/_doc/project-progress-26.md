# Ferio Project Progress 26

**Checkpoint date:** August 11, 2026  
**Milestone:** Release 1 — Reservation release and adjustment concurrency  
**Status:** PostgreSQL proves cancellation restores reserved inventory exactly once and concurrent manual adjustments cannot create stale stock or duplicate ledger evidence

## Delivered

### Serializable inventory adjustment

- Changed manual inventory adjustment to use a serializable Prisma transaction.
- Converts Prisma write-conflict code `P2034` into an actionable stock-changed domain conflict.
- Prevents two simultaneous adjustments from reading one stale on-hand value and both recording movements against a single final balance.
- Preserves the existing guard that on-hand stock cannot fall below reserved plus damaged quantities.

### Cancellation conflict handling

- Retains serializable cancellation and now converts `P2034` into an actionable cancellation retry conflict.
- Keeps reservation release, reserved-stock decrement, inverse movement, order transition, histories, and audit evidence in one transaction.
- Keeps the cancellation transactional message post-commit and deduplicated.

### PostgreSQL lifecycle proof

- Confirms an order, cancels it, and verifies reserved stock returns to zero while on-hand stock remains unchanged.
- Verifies the active reservation becomes `RELEASED` with a release timestamp.
- Verifies one `RESERVE` movement and one inverse `RELEASE` movement with matching quantities.
- Verifies singular cancellation history, audit evidence, and transactional outbox message.
- Races two valid manual decrements beside an active reservation and proves one commits while one returns a domain conflict.
- Verifies one manual movement, one inventory-adjustment audit record, and a final balance consistent with the active reservation.

## Validation

| Project | Check | Result |
| --- | --- | --- |
| Backend | Full migration deploy to disposable PostgreSQL | Passed; 17 of 17 migrations |
| Backend | PostgreSQL integration suites | Passed; 2 suites and 8 tests |
| Backend | Cancellation reservation release | Passed; one inverse movement and restored reserved balance |
| Backend | Concurrent manual adjustment | Passed; one commit, one conflict, consistent ledger |
| Backend | Focused catalog and order tests | Passed; 2 suites and 10 tests |
| Backend | Full unit tests | Passed; 19 suites and 67 tests |
| Backend | Production build including shared libraries | Passed |
| Infrastructure | Disposable database cleanup | Passed; test database removed |

## Still Open

- Duplicate COD placement idempotency still needs PostgreSQL integration proof.
- Concurrent cancellation against another inventory mutation is not yet covered.
- Settlement recording and provider report concurrency remain pending.
- Broader category, product, and media database integration remains pending.
- Provider sandbox, prepaid payment, and combined full-stack tests remain pending.

## Recommended Next Work

1. Build a valid active cart and checkout draft, then race two COD placement commands with the same idempotency key.
2. Prove one order, one immutable snapshot set, one customer/address outcome, and deduplicated placed/confirmed messages.
3. Verify replay returns the original order without repeating stock or messaging effects.
4. Continue into cancellation-versus-adjustment contention only after placement idempotency is proven.
