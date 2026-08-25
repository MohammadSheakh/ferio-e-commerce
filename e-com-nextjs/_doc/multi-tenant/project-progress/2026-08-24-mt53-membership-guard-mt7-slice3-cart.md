# Project Progress — MT-2 §5.3 Membership Guard + MT-7 Slice 3 (Cart Module)

**Date:** August 24, 2026 (sixth increment)
**Scope:** Staff-to-organization binding shipped and wired as a proof point; the cart module — including guest carts, saved/shared carts, merge, and reorder — now resolves against the tenant database.

---

## What landed

### 1. `TenantMembershipGuard` + `TenantMembershipService` (ADR-0004, checklist §5.3)

The missing gate between "a valid session" and "a member of THIS business":

| Scenario | Behavior |
|---|---|
| `TENANCY_ENABLED=false` | Passthrough — legacy authorization model untouched |
| Tenancy on + authenticated + active roster row for resolved org | Allowed; membership (`OWNER`/`STAFF`) attached to the request |
| Valid session belonging to a different organization | **Denied** `TENANT_MEMBERSHIP_REQUIRED` (cross-tenant replay) |
| Unauthenticated under tenancy | Denied |

Roster lookups hit the control plane's `OrganizationMember` with a 60-second per-process cache keyed by org+email; `invalidate()` makes roster changes effective immediately. Guard is applied **after** AuthGuard/RolesGuard and is wired into `admin/catalog` as the proof point — remaining admin controllers sweep at MT-10 cutover, before the flag can flip on.

Tests: LEGACY passthrough performs no roster lookup; member acceptance attaches role; cross-org replay denial asserts the query was scoped to the resolved organization; unauthenticated denial; cache/invalidate behavior.

### 2. Cart module behind tenant scope (15 methods)

Same verified structural sweep as catalog: every prisma-touching method — active cart CRUD, validate, guest↔account merge, saved carts, shared-cart import/claim, reorder — resolves through the explicit `db()` helper.

Tenant consequences that required zero extra code:

- **Guest carts are tenant-local by construction**: opaque tokens live in each tenant database, so token values cannot collide or leak across businesses.
- **Cookie isolation is free**: cart cookies are set without a Domain attribute → host-only → each storefront subdomain carries only its own cart.
- Saved-cart share tokens are bound to one tenant because the rows themselves live inside that tenant's database.
- Reorder keeps its ownership check (caller must be linked to the order's customer profile) and now executes against the tenant's own orders.

## Verification

- Backend build clean; **70 suites / 282 tests passing** (+5: four guard scenarios incl. cross-tenant replay, one caching test).
- Structural verification script reports zero methods using `db.` without a prior resolution, zero stray legacy references.

## Honest notes

- The membership stub needed two iterations to correctly scope its fake roster by organizationId — exactly the class of subtlety negative tests exist to catch; final assertions verify the control-plane query itself was organization-scoped.
- Multi-line method signatures exceed naive line-window checks; both sweep scripts now verify resolution-before-first-use rather than fixed positions.

## Checklist movement

§5.3 items marked PARTIAL with concrete evidence; §10.3 cart-binding/merge/share-token items marked done; reorder proof marked PARTIAL pending the orders-module integration case.

## Next

1. **MT-7 slice 4** — checkout draft + order placement tenancy (first financial-path migration), reusing the same sweep-and-verify discipline.
2. Sweep remaining admin controllers with `TenantMembershipGuard` at MT-10; Platform Admin UI (MT-9).
