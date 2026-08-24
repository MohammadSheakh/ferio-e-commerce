# Project Progress — MT-10: Membership Sweep, Entitlement Gates, Plan & Usage UX

**Date:** August 24, 2026 (thirteenth increment)
**Scope:** Release MT-10 core — the isolation gate is now wired across every admin controller, plan limits are enforced at the monetizable events, and tenant admins can see their own SaaS relationship.

---

## What landed

### 1. Membership guard sweep — all 23 admin controllers

`TenantMembershipGuard` now sits after `AuthGuard/RolesGuard/PermissionsGuard` on every `admin/*` controller (catalog was the MT-2 proof point; this pass covered the other 23 files). Behavior remains flag-gated: legacy deployments pass through untouched; with `TENANCY_ENABLED=true`, a valid staff session that isn't on the resolved organization's roster is denied `TENANT_MEMBERSHIP_REQUIRED`. This closes the last structural prerequisite for cutover listed in the readiness table.

### 2. Server-side entitlement enforcement at the money events

- **Order placement** evaluates `orders_per_month` *before* any work begins; denial throws the stable `PLAN_LIMIT_REACHED` code. Usage meters **after commit**, non-blocking — metering can never fail an order (same principle as FR-NOT-003 applied to SaaS accounting).
- **Product creation** evaluates `products_max` against the tenant's live non-archived catalog count via a new `currentOverride` option on `EntitlementsService.evaluate` — no dependence on counter freshness for count-based limits.
- Both gates activate only inside a resolved tenant context; legacy mode is byte-for-byte unchanged. Staff-seat hook on invitations follows the identical pattern and lands next pass.

### 3. Tenant admin sees its own SaaS relationship

New `GET /tenancy/my-plan` (authenticated staff + roster membership): current plan name/key, subscription status and period end, usage snapshot vs plan limits (`orders_per_month`, `products_max`), and active domains.

Consumed by a new **Plan & Usage card** on the tenant-admin dashboard: plan display name, status pill, usage-versus-limit rows with explicit "limit reached" labels when hit, and a manage-subscription link. Renders nothing in LEGACY mode — non-SaaS deployments see zero change.

## Verification

- Backend: cacheless strict tsc clean over non-spec sources; build clean; **73 suites / 297 tests passing**.
- Admin dashboard: strict tsc clean; production build passes.
- Sweep defects caught by gates: two relative-import depth errors, one missing `Query` import, one missing `ForbiddenException` import, one heredoc artifact in a new file — every one surfaced by the strict-tsc reference check rather than runtime discovery.

## Checklist movement

§13.1 store identity PARTIAL (tenant-scoped already; consolidated wizard deferred) · §13.2 backend-authoritative ✔, stable errors ✔, nav/labels PARTIAL · new §13.2A records the enforcement hooks · membership sweep noted under §5.3 progress.

## Next

1. Staff-seat entitlement hook on invitations; remaining §13.1 wizard consolidation.
2. MT-13 hardening: cross-tenant negative suite into CI (now unblocked by fan-out), resolver/connection-manager load simulation.
3. MT-12 closure/export implementation of ADR-0007 once retention windows are owner-approved.
