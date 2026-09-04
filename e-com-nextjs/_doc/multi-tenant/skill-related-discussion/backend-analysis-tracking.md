
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

## Follow-Up Status

### Fixed In `2e5a8cd`

- PostgreSQL pool sizing, idle timeouts, acquisition timeouts, connection
  recycling, and graceful shutdown are now explicit for the control-plane and
  tenant pools. Docker and `.env.example` expose the same bounded settings.
- Operations health now exposes control-plane pool pressure and tenant-client
  cache metrics.
- Transactional messaging now detects stale worker leases per tenant during
  the scheduled sweep and marks them `BLOCKED` for operator review. It does
  not blindly retry because the external provider may already have accepted
  the request.

### Still Requires Infrastructure Or Operational Work

These are intentionally not marked as application-code fixes:

- PgBouncer or an equivalent deployment-level pooling strategy and a measured
  PostgreSQL connection budget across API, worker, and tenant pools.
- Read replicas or dedicated read models for analytics and reporting.
- Asynchronous report exports for workloads larger than the current bounded
  5,000-row synchronous export.
- Redis cluster and WebSocket adapter capacity planning, including failover
  and key/cardinality testing.
- Load, stress, failure-mode, and disaster-recovery restore testing at
  realistic tenant distributions.
- Exporting request/queue/database metrics to a durable metrics backend with
  alert thresholds. The application currently exposes bounded in-process
  p95/request, queue, tenant, and pool signals.
- Review and retirement plan for stale Mongoose source and duplicate queue
  implementations. The active application path is Prisma/BullMQ, but the
  legacy source remains for an explicit migration decision.

## Review Rule

## TypeScript Strictness Review

- Fixed: enabled `noImplicitAny`, `useUnknownInCatchVariables`,
  `strictBindCallApply`, and `noFallthroughCasesInSwitch` in the backend
  compiler configuration.
- Fixed: removed application-owned `any` from shared pagination, generic
  Prisma boundaries, platform request/auth handling, settings, product
  requests, customer accounts, store locations, order audit actors, user
  profiles, Redis boundaries, and HTTP exception handling.
- Verified: `pnpm exec tsc --noEmit` passes and `pnpm test -- --runInBand`
  passes with 90 suites and 408 tests.
- Remaining explicit `any` inventory is isolated for a follow-up pass in
  legacy Mongoose/base-entity adapters, file-upload and Cloudinary adapters,
  authentication provider profile contracts, chat/socket dynamic payloads,
  and queue/third-party SDK contracts. These are boundaries requiring domain
  interfaces or vendor-specific types, not permission to add `any` to new
  code.

When a future backend audit finding is fixed, add its status, implementation
evidence, validation command, and commit reference here. Do not rewrite the
historical analysis document unless explicitly requested.
