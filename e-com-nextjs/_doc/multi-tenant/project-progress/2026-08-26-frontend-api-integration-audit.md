# Project Progress — Three-Frontend API Integration Audit

**Date:** August 26, 2026
**Scope:** Verify every frontend API call site across ferio-customer-web, ferio-admin-dashboard (Tenant Admin) and ferio-platform-admin resolves to a real backend route; close the gaps found.

---

## Method

1. Inventoried every Nest controller prefix + method route (`api/v1` global
   prefix).
2. Extracted every call site from each frontend (BFF route handlers, lib API
   clients, direct fetches).
3. Cross-checked path-by-path; sampled ambiguous ones against controller
   source.

## Results per app

### ferio-customer-web — ✅ fully integrated

- Central client `lib/backend.ts` targets `api/v1` with correlation IDs and
  **tenant host forwarding** on all server-side fetches (`host-forward`), so
  every storefront request resolves the correct tenant database.
- Catalog/cart/checkout/auth/account(commerce·notifications·wallet·warranty)/
  store-config/settings/purchase-activity/services/payments/initiate·retry/
  delivery-personnel portal paths all map 1:1 onto backend controllers.
- Guest cart cookie semantics remain host-only → tenant-safe automatically.

### ferio-admin-dashboard (Tenant Admin) — ✅ fully integrated

- `admin/*` call sites (catalog, orders incl. confirm/cancel/fulfillment/
  store-pickup/exceptions, returns lifecycle incl. eligibility, customers,
  payments+recovery, reconciliation, reports+orders-export, settlements incl.
  preflight/template, shipping incl. polls/webhooks/providers, rto, services,
  staff, wallet, transactional-messages, store-locations, audit-logs,
  abandoned-carts, operations health) all compose correctly — including the
  returns routes that live under `@Controller('admin')` +
  `orders/:orderId/returns…` (initial grep false-positive resolved).
- PlanUsageCard consumes `/tenancy/my-plan` (owner usage view).
- Socket client uses ticket-based auth; org-scoped rooms are enforced
  server-side regardless of client behavior.

### ferio-platform-admin — ✅ integrated; one gap closed

All console calls verified against the control plane (dashboard,
organizations CRUD/provision/status/provisioning-runs, plans,
migrations start/list/pause/resume, support-access list/revoke, subscriptions,
billing invoices/attempts, database-health, per-org usage + reconcile).

**Gap found & fixed:** the closure lifecycle endpoints existed but had no UI.
`OrgActions` now offers **Start closure** (reason prompt → audited
CLOSURE_PENDING with domains disabled) for ACTIVE orgs and **Finalize
closure** (retention-aware confirm → registry retirement) for CLOSURE_PENDING
orgs. §12.2 flipped `[x]`.

## Verification

| Surface | Gate | Result |
|---|---|---|
| ferio-nest-prisma | unit suite | ✅ 80 suites / 339 tests |
| ferio-customer-web | tsc --noEmit + build | ✅ |
| ferio-admin-dashboard/ferio-admin | tsc --noEmit + build | ✅ |
| ferio-platform-admin | tsc --noEmit + build | ✅ |

## Notes

- `NEXT_PUBLIC_FERIO_API_URL` / `FERIO_API_URL` env contract is consistent
  across apps; customer-web falls back to same-origin `/api/v1` for
  subdomain deployments.
- ferio-mobile-expo54 shares the same REST contracts by design (PRD §9.6);
  not re-audited in this pass.
