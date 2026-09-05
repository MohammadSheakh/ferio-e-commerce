# Platform Control-Plane Module

## Scope

Platform authentication, organization/domain lifecycle, plans/entitlements,
subscriptions, provisioning/migrations, billing, support access, usage, and
tenant closure.

## Architecture Score

**82%**. The separate platform Prisma client and platform-auth realm are the
right architecture. Lifecycle state machines, provisioning orchestration,
audit services, and plan/usage concepts are strong, but this is the most
privileged plane and requires production-grade operational testing.

## Routes

| Route group | Score | Review |
|---|---:|---|
| `POST/GET /platform/auth/*` | 84% | Separate principal and throttling are good; test token/session revocation. |
| `POST/GET /platform/organizations*` | 82% | Good control-plane ownership; provisioning failure/retry and slug races need tests. |
| `GET/POST/PATCH /platform/plans*` | 82% | Entitlement management is explicit; protect plan changes from breaking active subscriptions. |
| `GET/PATCH /platform/subscriptions*` | 80% | Billing state transitions require provider reconciliation and idempotency. |
| `GET /platform/billing/*` | 80% | Safe projection required; bound all directory queries. |
| `POST /platform/migrations*` | 78% | High-risk operation needs operator authorization, locking, resumability, and dry-run evidence. |
| `POST /platform/support-access*` | 78% | Must use time-limited, reasoned, tenant-bound elevation with complete audit. |
| `GET/POST /platform/usage*` | 78% | Usage reconciliation and entitlement enforcement need aggregate/index capacity tests. |
| `POST /platform/organizations/:id/close*` | 78% | Closure must be resumable, idempotent, and data-retention compliant. |

## Tasks

1. Add end-to-end provisioning/migration/closure failure tests.
2. Define platform operator RBAC and step-up authentication policy.
3. Add immutable audit and reconciliation runbooks for billing/entitlements.
4. Load-test organization listings, usage aggregation, and migration queues.
