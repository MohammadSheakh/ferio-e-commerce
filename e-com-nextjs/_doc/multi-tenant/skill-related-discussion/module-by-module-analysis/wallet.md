# Wallet Module

## Scope

Customer wallet summary/top-up request and admin top-up review.

## Architecture Score

**75%**. Customer/admin split and financial workflow intent are sound, but
wallet balance invariants and provider/review idempotency require strong
transaction and reconciliation tests.

## Routes

| Route | Score | Review |
|---|---:|---|
| `GET /account/wallet` | 78% | Owner-scoped balance read; project ledger fields safely. |
| `POST /account/wallet/top-ups` | 74% | Must be idempotent and never trust client amount/status. |
| `GET /admin/wallet/top-ups` | 76% | Bounded tenant admin ledger query. |
| `PATCH /admin/wallet/top-ups/:id` | 74% | Atomic review/balance update and audit required. |

## Tasks

1. Add ledger invariants, unique external references, and reconciliation jobs.
2. Add concurrent review/duplicate callback tests.
3. Keep wallet mutations separate from external payment network calls.
