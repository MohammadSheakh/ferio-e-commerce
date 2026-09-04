
# Backend Analysis Tracking

This document tracks implementation status for findings from
`backend-analysis-2.md`. That analysis document is intentionally left
unchanged.

## Review Snapshot

- Reviewed against commit `df5a8b8` (`fix(backend): harden tenant boundaries and chat workers`).
- Verification: `pnpm exec tsc --noEmit` passed.
- Verification: `pnpm test -- --runInBand` passed, 90 suites and 408 tests.
- Verification: `git diff --check` passed.
- Prisma clients were regenerated before verification.

## Finding Status

| # | Finding | Status | Implementation evidence |
|---|---|---|---|
| 1 | Customer notifications missing tenant module wiring | Fixed | `customer-notifications.module.ts` imports `TenancyModule`. |
| 2 | Storefront analytics missing tenant module wiring | Fixed | `storefront-analytics.module.ts` imports `TenancyModule`. |
| 3 | Audit reads bypass tenant database | Fixed | `AuditService` resolves the ambient tenant client for writes and reads, while preserving explicit transaction clients. |
| 4 | Operations health reads legacy commerce database | Fixed | `OperationsHealthService` uses the resolved tenant client for database probes and commerce evidence. |
| 5 | Suspended tenants can mutate uncovered domains | Fixed | Product content, service booking, and store location mutations call `assertTenantCommerceWritable()`. |
| 6 | Courier workers fall back without tenant identity | Fixed | Webhook and polling processors fail closed in tenancy mode when `organizationId` is absent. |
| 7 | Direct chat lookup is unbounded and race-prone | Fixed | Lookup is bounded and direct creation is serialized with a PostgreSQL transaction advisory lock. |
| 8 | Conversation creation is not atomic | Fixed | Conversation, participants, initial message, and snapshot update run in one Prisma transaction. |
| 9 | Chat pagination lacks safe bounds | Fixed | Chat DTOs validate numeric pagination and cap limits at 100; service methods also clamp defensively. |
| 10 | Chat jobs omit tenant identity | Fixed | Chat notification jobs carry `organizationId` from tenant context. |
| 11 | Active chat queue processors are missing | Fixed | `ChatNotificationProcessor` is registered in `ChattingModule`; last-message snapshots are updated transactionally instead of relying on the legacy queue. |
| 12 | Product review submission masks all database errors | Fixed | Only Prisma `P2002` is translated to a duplicate conflict; other errors are rethrown. |

## Scope Remaining

The fixes above address the confirmed findings from the second audit. The
following audit recommendations remain separate scale-readiness work and are
not claimed as solved by commit `df5a8b8`:

- PgBouncer or an equivalent connection-pooling architecture and capacity plan.
- Read replicas/read models for analytics and reporting workloads.
- Asynchronous exports and large report generation.
- Outbox/event delivery guarantees for integrations and notifications.
- Redis cluster and WebSocket adapter capacity planning.
- Load, stress, failure-mode, and disaster-recovery testing at realistic tenant distributions.
- Metrics and operational thresholds for p95/p99 latency, pool saturation, queue lag, and tenant failures.
- Review and retirement plan for stale Mongoose and duplicate infrastructure implementations.

## Review Rule

When a future backend audit finding is fixed, add its status, implementation
evidence, validation command, and commit reference here. Do not rewrite the
historical analysis document unless explicitly requested.
