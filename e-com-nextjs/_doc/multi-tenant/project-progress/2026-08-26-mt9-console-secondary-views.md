# Project Progress — MT-9 Console Secondary Views (Billing, Subscriptions, Fleet Health)

**Date:** August 26, 2026
**Scope:** Platform Admin operational surface expansion — subscription directory, platform billing views, and fleet schema-health/drift view, backed by new control-plane endpoints.

---

## Backend (ferio-nest-prisma)

New Platform Admin endpoints (permission-guarded, control-plane reads only):

| Endpoint | Permission | Purpose |
|---|---|---|
| `GET /platform/subscriptions` | `subscription:read` | Subscription directory: org, plan, status, period end, cancel-at-period-end |
| `GET /platform/billing/invoices` | `saas_billing:read` | Latest invoices with PAID/OPEN outcome |
| `GET /platform/billing/payment-attempts` | `saas_billing:read` | Provider attempts (INITIATED/SUCCEEDED/FAILED) with invoice reference |
| `GET /platform/database-health` | `organization:read` | Every registered tenant DB vs the canonical migration-chain head (`TenantSchemaBootstrapper.listMigrations()`), per-row up-to-date flag + fleet summary |

## Console (ferio-platform-admin)

Three server-component pages following the existing BFF + table patterns:

- **/subscriptions** — organization × plan × status directory with renewal dates.
- **/billing** — invoices table (number/org/period/amount/status) + payment-attempts table.
- **/database-health** — fleet summary card (`N/M up to date`, canonical head, behind-count callout) plus per-database rows with `MIGRATION REQUIRED` highlighting.

Side navigation extended with Subscriptions / Billing / Database Health.

## Checklist updates

§12.1: migration fleet status ✓ · tenant DB health ✓ · platform billing outcomes ✓ · usage/limit alerts ✓
§12.3: view subscriptions ✓ · view invoices/payment attempts ✓
§12.4: schema version drift view ✓

## Verification

| Gate | Result |
|---|---|
| Backend typecheck + unit suite | ✅ 80 suites / 339 tests |
| Backend production build | ✅ clean |
| ferio-platform-admin `tsc --noEmit` | ✅ 0 errors |
| ferio-platform-admin production build | ✅ clean |

Still open in MT-9: provisioning retry UI, live DB health probe (current view is registry-state based), pause/resume rollout buttons wiring (API exists on migrations page forms), support-access scope restriction and action recording.
