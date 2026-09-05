# Audit Module

## Scope

Tenant audit-log writes and admin audit-log queries.

## Architecture Score

**72%**. The service has a focused responsibility, typed audit input, safe JSON
normalization, and transaction-client support. Tenant fail-closed behavior was
recently corrected, but transaction adoption and query policy need expansion.

## Routes

| Route | Score | Review |
|---|---:|---|
| `GET /admin/audit-logs` | 75% | Protected admin route with DTO pagination and tenant-aware reads; verify permission granularity and maximum page bounds. |

## Strengths

- Audit input records actor, source, entity, and before/after values.
- `safeAuditJson` prevents unsafe values from breaking persistence.
- The service accepts a transaction client for atomic writes.
- Tenant mode now fails closed instead of silently reading the base database.

## Confirmed Issues

- Many callers do not visibly pass the transaction client when the business
  mutation and audit record must be atomic.
- Audit query result shape duplicates `items`, `results`, and `data`, which
  indicates an unresolved API compatibility contract.
- Retention, indexing, and tamper-evidence strategy need explicit operational
  ownership.

## Tasks

1. Add a required transaction-oriented mutation helper for critical events.
2. Verify `TenantMembershipGuard` and `AUDIT_READ` permission coverage.
3. Add indexes and retention policy for action/entity/time queries.
4. Add cross-tenant and rollback tests.
