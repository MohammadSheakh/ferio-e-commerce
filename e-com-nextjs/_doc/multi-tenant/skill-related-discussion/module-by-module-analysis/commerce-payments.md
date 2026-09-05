# Commerce Payments Module

## Scope

Customer payment provider discovery, initiation/retry/callback handling, admin
ledger inspection, recovery queue operations, and provider adapters.

## Architecture Score

**82%**. Callback tenant routing, HMAC callback-token strategy, ledger
separation, and recovery processing are strong. Real-provider failure and
replay testing remains a release requirement.

## Routes

| Route | Score | Review |
|---|---:|---|
| `GET /payments/providers` | 82% | Safe readiness/readiness metadata boundary. |
| `POST /payments/initiate` | 84% | Must be idempotent by order/payment attempt and tenant-scoped. |
| `POST /payments/retry` | 82% | Retry state and provider replay rules need integration tests. |
| `ALL /payments/callback/:provider/:eventType` | 84% | Strong callback boundary; verify raw-body signature and replay handling per provider. |
| `GET /admin/payments/attempts*` | 84% | Good admin ledger query; verify sensitive field projection and bounds. |
| `GET /admin/payments/providers` | 82% | Admin readiness view. |
| `GET /admin/payments/recovery/queue-health` | 82% | Useful operations endpoint; do not expose provider secrets. |
| `POST /admin/payments/recovery/sweep` | 80% | Must be permissioned, idempotent, and rate-controlled. |

## Tasks

1. Add contract tests for every callback provider and duplicate delivery.
2. Verify payment attempt uniqueness and transaction boundaries.
3. Add provider timeout, circuit-breaker, and reconciliation runbooks.
