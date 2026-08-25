# Project Progress — MT-7 Commerce Service Sweeps Completed (Split-Brain Closed)

**Date:** August 25, 2026
**Scope:** Final MT-7 sweep pass — every remaining commerce-plane service routed behind `TenantDbService`. Completes the audit's #1 priority item ("Sweep remaining 19 services") for all commerce-plane code.

---

## What landed

### Services swept this pass (9 + settings admin paths)

| Service | Refs routed | Notes |
|---|---:|---|
| `customer-account.service.ts` | 22 | link / profile / address flows; identity-link surface now tenant-local |
| `staff-access.service.ts` | 12 | invitations, tokens, deactivation, resets; staff-plane is per-tenant |
| `settlement-imports.service.ts` | 10 | import/classify/persist/correction-claim paths |
| `product-content.service.ts` | 6→0 | finished half-routed file (reviews/banners admin paths) |
| `courier-router.service.ts` | 1 | provider recommendation reads tenant shipment providers |
| `settings.service.ts` (admin) | 5 | getAllSettings / pagination / delete now tenant-routed; public path was already swept |

Plus completion of the user's in-flight WIP sweeps verified end-to-end: `store-locations` (6), `service-booking` (8), `warranty` (5), `product-request` (4).

### DI wiring

`TenancyModule` added to the imports of: CustomerAccountModule, SettlementsModule, ProductContentModule, ShippingModule, SettingsModule. (`@Optional()` injection keeps legacy mode working when the module is absent — no module was left without the provider.)

## Intentionally not swept (documented boundaries)

- **Identity plane** — `auth`, `two-factor`, `oauthAccount`, `userDevices`, `userProfile`, `user`: platform-scoped until the PO-015 auth-migration decision lands.
- **operations-health**: platform health metrics by design.
- **audit.service**: writes through whatever client the caller supplies — per-DB by construction.
- **socket-auth / socket-room**: org-claim propagation is the remaining MT-8 WebSocket slice (§11.3).

**Result:** zero `this.prisma.` references remain on any commerce request path. The split-brain risk flagged in the completion audit (§5) is closed for commerce modules — `TENANCY_ENABLED=true` no longer splits catalog/customer/order data across databases.

## Verification

| Gate | Result |
|---|---|
| Strict typecheck incl. specs (`tsc --noEmit -p tsconfig.json`) | ✅ 0 errors |
| Unit suite | ✅ 76 suites / 314 tests |
| Integration suite (real PostgreSQL, canonical chain deployed via globalSetup) | ✅ 7 suites / 33 tests — incl. settlements import flows exercising the newly swept service |
| Production build | ✅ clean |

## Checklist updates

- §10.9 "Tenant-scope settlement imports and evidence" → `[x]`
- §10.10 "Tenant-scope all records and settings" → `[x]`
- §10.12 feature flags/settings → annotated PARTIAL (settings done; flag separation open)
- New §10.13 sweep inventory subsection documenting the full map + intentional exclusions

## Next (unchanged from audit, re-ranked)

1. Socket org-claim propagation (§11.3 remainder) + courier polling/callback-retry fan-outs noted in §10.4A
2. Platform Admin console secondary views (billing, migration fleet, backup)
3. Observability envelope (orgId in structured logs, denial counters — §16.1)
4. Owner-gated: managed Postgres executor swap, wildcard DNS/TLS, SSLCommerz merchant account, object storage
