# Project Progress — Per-Org Usage Console Integration + §7.4 Closure

**Date:** August 26, 2026
**Scope:** Frontend integration for the usage-metering APIs (Platform Admin organization detail), closing §7.4 provisioning operations UI in full.

---

## What landed

### Organization detail → Usage card (ferio-platform-admin)

The organization detail page now fetches `GET /platform/organizations/:id/usage`
in parallel with its existing calls and renders a **Usage card**:

- One row per authoritative registry metric (orders_per_month,
  products_max, staff_seats): recorded value, plan limit, and a state pill —
  `NEAR LIMIT` (pale semantic warning) when the backend threshold flag is
  set, `OK`, or `NOT IN PLAN`.
- A **"Recount from facts"** pill-action POSTs to the audited
  `/usage/reconcile` endpoint via the httpOnly-cookie BFF, reports how many
  counters were corrected, and refreshes the server component.

Design language: hairline table, uppercase micro-label eyebrows, muted pills
only for semantics, solid-black pill buttons, no shadows/gradients.

### Checklist closure

- **§7.4 Provisioning operations UI — all nine lines `[x]`.** The console
  already carried list/detail/timeline/domains/members/schema surfaces;
  this pass adds usage, and "Run provisioning" is documented as the retry
  control over the idempotent resumable orchestrator.
- §12.4 Provisioning retry `[x]`; §12.1 usage-alerts line updated to cite
  the console surface.

## Verification

| Gate | Result |
|---|---|
| Backend unit suite | ✅ 80 suites / 339 tests |
| ferio-platform-admin `tsc --noEmit` | ✅ |
| ferio-platform-admin production build | ✅ |

## Remaining actionable

1. §16.3 load simulations
2. Owner-gated: managed Postgres executor swap, wildcard DNS/TLS record,
   SSLCommerz merchant account, object storage provider, data-residency
   review, pilot tenants
