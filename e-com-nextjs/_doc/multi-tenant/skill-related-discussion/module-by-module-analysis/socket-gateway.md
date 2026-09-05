# Socket Gateway Module

## Scope

Socket authentication tickets, guest tickets, authenticated connections,
tenant-prefixed rooms, presence, realtime events, and notifications.

## Architecture Score

**63%**. Tenant binding and room authorization intent are good, but dynamic
payloads, excluded strict checking, cross-instance adapter capacity, and event
authorization make this a high-risk scale boundary.

## Routes

| Route | Score | Review |
|---|---:|---|
| `POST /socket-auth/ticket` | 72% | Ticket must bind user, organization, expiry, and intended socket audience. |
| `POST /socket-auth/guest-ticket` | 68% | Guest scope must be minimal, rate-limited, and non-escalatable. |
| Socket connection/events | 62% | Room and event authorization are present conceptually; dynamic payload typing and multi-instance delivery require hardening. |

## Tasks

1. Define typed event envelopes and reject unknown payloads at the gateway.
2. Add Redis adapter/load tests for reconnects, fan-out, and room isolation.
3. Remove socket directory from strict-check exclusions incrementally.
4. Add cross-tenant room/event authorization tests.
