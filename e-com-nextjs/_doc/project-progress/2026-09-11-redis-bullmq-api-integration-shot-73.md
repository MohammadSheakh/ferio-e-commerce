# Redis and BullMQ API Integration - Shot 73

Date: 2026-09-11

## Scope

This shot exercised the queue and Redis runtime dependencies behind the
backend APIs using the local project Redis container on host port `6380` and
the isolated prefix `ferio:test:shot73:`.

## Fixes

- Corrected three stale smoke-test imports after shipping and reconciliation
  processors/queues were moved into their `processors/` and `queues/`
  directories.
- Made the Redis-capacity smoke client wait for ioredis `ready` and create a
  fresh client for the reconnect check.
- Prevented the queue-capacity test from deleting completed jobs before
  `waitUntilFinished` observes them.
- Matched the queue-capacity scheduler assertion to BullMQ 5's `scheduler.key`
  field rather than the removed `scheduler.id` field.

## Evidence

- `pnpm run test:queue-smoke` passed: 6 suites / 11 tests.
- Passing coverage includes payment-recovery retry scheduling, shipping
  webhook retry, shipping polling retry, reconciliation retry, bounded queue
  capacity, scheduler idempotence, Redis pipelining, and Redis reconnect
  recovery.
- Backend application TypeScript check passed with
  `pnpm run typecheck:application`.
- Lint passed for all five changed queue smoke tests.
- A non-failing Node `MaxListenersExceededWarning` is still emitted during
  BullMQ queue teardown. It does not fail the suite, but should be removed in
  a later queue-lifecycle cleanup rather than suppressed silently.

## Assessment

The Redis/BullMQ runtime dependency path is now executable in the local
environment and the smoke suite is green. This does not prove production Redis
failover, queue fairness under real tenant load, or positive two-tenant browser
isolation.
