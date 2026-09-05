# Refunds Module

## Scope

Return-case refund eligibility, refund creation, and provider/result recording.

## Architecture Score

**76%**. Clear separation from returns, typed admin routes, and audit-oriented
mutations are good. Financial idempotency and provider reconciliation need
stronger evidence.

## Routes

| Route | Score | Review |
|---|---:|---|
| `GET /admin/returns/:returnCaseId/refund-eligibility` | 78% | Must calculate from authoritative return/payment state. |
| `GET /admin/returns/:returnCaseId/refunds` | 78% | Tenant-scoped history and sensitive-field projection required. |
| `POST /admin/returns/:returnCaseId/refunds` | 76% | Must be idempotent and transactionally reserve/refund money. |
| `POST /admin/refunds/:id/result` | 78% | Provider callback/result transition needs replay and legal-state tests. |

## Tasks

1. Add unique idempotency keys for refund attempts.
2. Add provider timeout, duplicate callback, and reconciliation tests.
3. Verify audit records include actor, previous status, and safe provider data.
