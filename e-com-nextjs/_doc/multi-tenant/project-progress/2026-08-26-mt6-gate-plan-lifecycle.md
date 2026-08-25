# Project Progress — MT-6 Gate Proven: Plan-Limit Lifecycle E2E

**Date:** August 26, 2026
**Scope:** The named MT-6 gate — one tenant hitting a plan limit, unlocking on upgrade, preserving data on downgrade — as a real-PostgreSQL integration proof.

---

## What landed

`test/plan-limit-lifecycle.integration-spec.ts` wires the REAL
`EntitlementsService` + `UsageService` (control-plane state in an in-memory
double) into a REAL `OrderService` running against a bootstrapped scratch
tenant database through the standard cart → checkout-preview → placement
path, then proves:

1. **Under-limit placement works** — two COD orders succeed; usage metered
   in real time (`orders_per_month = 2`).
2. **Limit denial is total** — the third placement rejects with the stable
   `PLAN_LIMIT_REACHED` code and creates ZERO partial orders (count stays 2).
3. **Upgrade unlocks without data changes** — switching to BUSINESS lets the
   third order place; the tenant's order list remains exactly
   `[first, second, third]`.
4. **Downgrade preserves history** — back to STARTER, further placements are
   blocked while all three historical orders survive untouched (§9.2).

## Checklist updates

- MT-6 gate line 1 → `[x]`
- §9.2 "Preserve tenant data across non-destructive subscription state
  changes" → `[x]`

## Verification

| Gate | Result |
|---|---|
| Strict typecheck incl. specs | ✅ |
| Unit suite | ✅ 80 suites / 339 tests |
| Integration suite (real PostgreSQL) | ✅ **9 suites / 35 tests** (+1) |
| Production build | ✅ clean |

## Remaining actionable work

1. Platform Admin secondary views (invoices/fleet tiles/DB probe UI)
2. Multi-client two-tenant socket E2E (CI Redis harness)
3. Load simulations (§16.3)
4. Owner-gated infra decisions (true launch blockers)
