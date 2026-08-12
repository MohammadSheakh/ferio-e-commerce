# Ferio Project Progress 27

**Checkpoint date:** August 11, 2026  
**Milestone:** Release 1 — Concurrent COD placement idempotency  
**Status:** Concurrent and replayed COD placement now return one durable order with one immutable snapshot set and deduplicated operational evidence

## Delivered

### Transactional placement audit

- Added one `ORDER_PLACED` audit record inside the serializable order-conversion transaction.
- Records the order reference, state, payment method, total, currency, source, cart, and customer relationship without storing the raw idempotency key.
- Rolls back with customer, address, order, snapshots, and cart conversion if placement fails.

### Active cart and checkout fixture

- Added a real sellable category, published product, image, weighted variant, finite inventory, active cart, cart item, delivery zone, accepted checkout draft, attribution, and COD verification policy.
- Uses the real cart validator and order service rather than mocked cart results.
- Includes discount and delivery calculations so the placement transaction revalidates the persisted checkout totals.

### Concurrent idempotency proof

- Races two COD placement calls using the same cart token and idempotency key.
- Proves both callers receive the same order ID.
- Proves PostgreSQL stores one order, one commerce customer, one reusable customer address, one immutable order address, one item snapshot, and one placement history record.
- Verifies product, variant, SKU, image, price, weight, quantity, line total, delivery fee, discount, final total, source, and medium snapshots.
- Proves one transactional placement audit and one deduplicated `ORDER_PLACED` outbox message.
- Replays placement after the cart is converted and proves it returns the original order without repeating audit or messaging effects.

## Validation

| Project | Check | Result |
| --- | --- | --- |
| Backend | Full migration deploy to disposable PostgreSQL | Passed; 17 of 17 migrations |
| Backend | PostgreSQL integration suites | Passed; 2 suites and 9 tests |
| Backend | Concurrent duplicate placement | Passed; both responses share one order ID |
| Backend | Replay after cart conversion | Passed; one order, audit, and placed message remain |
| Backend | Full unit tests | Passed; 19 suites and 67 tests |
| Backend | Production build including shared libraries | Passed |
| Infrastructure | Disposable database cleanup | Passed; test database removed |

## Still Open

- Auto-confirm placement under `NEVER` or below-threshold COD verification policy needs PostgreSQL integration proof.
- Cancellation racing a manual inventory adjustment remains pending.
- Settlement recording and provider report concurrency remain pending.
- Combined Customer Web, Admin Web, API, PostgreSQL, and Redis end-to-end execution remains pending.
- Provider sandbox and prepaid payment work remain pending or blocked.

## Recommended Next Work

1. Confirm an order with active reservation, then race cancellation against a valid manual stock decrement.
2. Prove every valid serialization order leaves stock, reservation, movement ledger, order state, audit, and outbox evidence consistent.
3. Translate any uncovered cancellation or adjustment database conflict into an actionable domain response.
4. Add auto-confirm placement integration after cross-command inventory contention is stable.
