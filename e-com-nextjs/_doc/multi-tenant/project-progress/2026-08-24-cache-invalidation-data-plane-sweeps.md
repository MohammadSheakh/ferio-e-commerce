# Project Progress — Cache Invalidation Wiring + Storefront Data-Plane Sweeps

**Date:** August 24, 2026 (eighteenth increment)
**Scope:** Closes a real correctness gap (stale domain→tenant cache entries after control-plane mutations) and moves the last storefront-facing data planes — analytics ingest and purchase-activity social proof — plus reports, behind tenant resolution.

---

## What landed

### 1. Domain-change → resolver cache invalidation (MT-2 §5.1 made real)

`TenantResolverService.invalidate(hostname)` existed since MT-2 but nothing called it: disabling or verifying a domain left stale positive cache entries for up to 60s. Now:

- New decoupled registry `platform/utils/domain-cache-invalidation.ts` (`setDomainCacheInvalidator` / `invalidateDomainCache`) — keeps `platform` free of any `tenancy` import, preserving the one-way dependency direction.
- `TenantResolverService.onModuleInit()` registers itself as the invalidator.
- `DomainsService` fires invalidation on: subdomain reservation · custom-domain verification · domain disable. Primary-domain changes only reorder active domains (same set), so no invalidation needed there.

### 2. Storefront data-plane sweeps

| Service | Methods | Why |
|---|---|---|
| `StorefrontAnalyticsService` | 5 | Per-storefront behavior events (product views, searches, add-to-cart) must land in that store's own database |
| `PurchaseActivityService` | 3 | Social-proof popup/history derives from real orders — tenant-scoped reads/writes |
| `ReportsService` | overview + orders export | Admin exports must never cross databases |

All via the verified structural sweep; strict tsc and full suite green after each file.

## Verification

- Cacheless strict tsc non-spec errors: **0**.
- Build clean; **73 suites / 297 tests passing**.

## Checklist movement

§10.12 purchase activity ✔ · analytics ingest recorded ✔ · report queries/exports PARTIAL (pattern proven, remaining families mechanical) · catalog search/filter cache item closed (no shared cache layer exists to leak).

## Next

Remaining program items are now almost entirely owner-gated:
1. Hosting/DNS/TLS decisions → then MT-14 alpha on real subdomains.
2. Credential-vault storage decision → §11.5.
3. Backup strategy + retention windows → MT-12 evidence views.
4. Plan catalog pricing → MT-9 billing administration activation.
