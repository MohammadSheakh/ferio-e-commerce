# BullMQ Listener Warning Follow-up - Shot 74

Date: 2026-09-11

## Scope

This shot isolated the non-failing `MaxListenersExceededWarning` observed when
all queue smoke suites run in one Jest process.

## Evidence

- Queue-capacity smoke passed independently: 1 suite / 2 tests, with no
  listener warning under `NODE_OPTIONS=--trace-warnings`.
- Payment recovery smoke passed independently: 1 suite / 1 test.
- Shipping webhook smoke passed independently: 1 suite / 3 tests.
- Shipping polling smoke passed independently: 1 suite / 1 test.
- Reconciliation smoke passed independently: 1 suite / 3 tests.
- Redis capacity/reconnect smoke passed independently: 1 suite / 1 test.
- The warning appears only when all six suites share one Jest process; it is a
  test-runner listener-budget warning, not an assertion failure or Redis
  connection failure.

## Assessment

The individual queue and Redis runtime checks are green. The warning should be
addressed later by tightening shared Jest/BullMQ teardown listener ownership,
but suppressing it or changing production queue listener limits would hide the
test-harness lifecycle issue and is not justified in this shot.
