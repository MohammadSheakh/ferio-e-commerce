# Customer Notifications Module

## Scope

Customer notification listing, unread counts, read state, bulk read, and
deletion.

## Architecture Score

**66%**. The API is focused and ownership-oriented, but the original module
dependency omission made tenant fallback possible and must remain a regression
test target.

## Routes

| Route | Score | Review |
|---|---:|---|
| `GET /account/notifications` | 70% | Owner-scoped read; enforce bounded pagination and tenant database. |
| `GET /account/notifications/unread-count` | 72% | Cheap indexed query expected; verify tenant and user indexes. |
| `PATCH /account/notifications/:id/read` | 68% | Must reject another user's notification without leaking existence. |
| `POST /account/notifications/read-all` | 68% | Bound transaction/update scope and preserve idempotency. |
| `DELETE /account/notifications/:id` | 68% | Owner scope and retention semantics need tests. |

## Tasks

1. Keep `TenancyModule` import and add module-wiring integration coverage.
2. Add notification indexes and cursor pagination.
3. Ensure producer queue envelopes always carry organization identity.
