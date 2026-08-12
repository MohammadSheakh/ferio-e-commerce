# Ferio Project Progress 28

**Checkpoint date:** August 11, 2026  
**Milestone:** Release 1 — Cross-command inventory convergence  
**Status:** Cancellation racing manual stock adjustment now converges to one of the valid serial outcomes without corrupting order, reservation, stock, ledger, audit, or message evidence

## Delivered

### Cross-command contention fixture

- Creates a confirmed COD order that reserves the entire on-hand balance in the `MAIN` warehouse.
- Races cancellation against a manual decrement that is invalid before reservation release but valid after release.
- Uses the real serializable order and catalog service transactions against PostgreSQL.

### Convergent outcome proof

- Requires cancellation to complete and the order to finish `CANCELLED` with cancelled fulfillment.
- Accepts adjustment only when it serializes after reservation release; otherwise requires an actionable domain conflict.
- Proves the reservation is released once with a release timestamp.
- Proves reserved stock reaches zero and on-hand stock equals the only valid outcome for whether adjustment committed.
- Proves exactly one reserve movement, one inverse release movement, and either zero or one matching manual-adjustment movement.
- Proves cancellation audit and outbox evidence occur once, while adjustment audit exists only when its movement commits.

### Fixture isolation

- Renames the earlier `MAIN` warehouse fixture after its assertions so each concurrency case receives an isolated active warehouse record.
- Leaves production code unchanged because the prior serializable transaction and `P2034` domain translations already handled both valid orderings.

## Validation

| Project | Check | Result |
| --- | --- | --- |
| Backend | Full migration deploy to disposable PostgreSQL | Passed; 17 of 17 migrations |
| Backend | PostgreSQL integration suites | Passed; 2 suites and 10 tests |
| Backend | Cancellation-versus-adjustment race | Passed; all committed evidence converged |
| Backend | Full unit tests | Passed; 19 suites and 67 tests |
| Backend | Production build including shared libraries | Passed |
| Infrastructure | Disposable database cleanup | Passed; test database removed |

## Still Open

- Auto-confirm COD placement under `NEVER` or below-threshold verification policy needs database proof.
- Auto-confirm replay must prove immediate reservation and messages remain singular.
- Settlement recording and provider report concurrency remain pending.
- Combined Customer Web, Admin Web, API, PostgreSQL, and Redis end-to-end execution remains pending.
- Provider sandbox and prepaid payment work remain pending or blocked.

## Recommended Next Work

1. Place COD with verification mode `NEVER` and prove immediate confirmed state plus reservation in the conversion transaction.
2. Verify one reserve movement, confirmation history, fulfillment history, placement audit, placed message, and confirmed message.
3. Replay and concurrently duplicate the auto-confirm request to prove all inventory and messaging effects remain singular.
4. Test insufficient stock during auto-confirm placement and prove cart conversion and customer/order snapshots roll back.
