# Owner Decisions Freeze — Ferio SaaS Production Posture

**Date:** August 26, 2026
**Source:** Owner answers to the 15-point decision request (verbatim intent preserved)
**Effect:** CODE IS NO LONGER BLOCKED by rows 1–4. Providers/credentials gate **deployment**, not architecture development.

---

## The 15 decisions

| # | Area | Decision |
|---|---|---|
| 1 | Managed PostgreSQL | Not finalized for production. Continue PostgreSQL 16 locally/CI; provisioning stays provider-abstracted; **do not couple to Neon/RDS/Supabase yet**. Provider chosen before production pilot, then connection budget computed from the real tier limit. |
| 2 | Backup policy | Approved conceptually: **per-tenant restore without affecting other tenants**; RPO ≤1h, RTO ≤4h, 30-day retention; backup credentials/storage separate from app credentials; final approval requires a successful restore drill. |
| 3 | Production domain | Not purchased yet. `PLATFORM_PUBLIC_DOMAIN` stays env-driven. Production: Cloudflare DNS + wildcard tenant subdomains + automated wildcard TLS. |
| 4 | SSLCommerz billing | Live credentials unavailable. Platform billing stays fully separate from tenant commerce payment credentials; adapter + sandbox/mock until a dedicated Ferio SaaS merchant account exists. |
| 5 | Courier verification | **Steadfast first**, then Pathao. One real E2E shipment must pass before launch: create → consignment ID → status/webhook → delivery/COD lifecycle. |
| 6 | Object storage | **Cloudflare R2**. Private S3-compatible buckets, tenant-prefixed keys `tenants/{organizationId}/…`, signed URLs for private objects, never trust client-supplied prefixes. |
| 7 | Metrics/alerting | Alpha: structured logs + health checks + basic metrics/alerts are sufficient. Dedicated production monitoring before public launch. |
| 8 | Redis | Single instance OK for local dev/controlled alpha. Managed Redis/Valkey with persistence before broader launch. |
| 9 | AuditLog retention | **2,555 days (7 years)** for security/financial/audit records unless legal review changes it. Configuration-driven, not a magic constant. |
| 10 | Support access | Tenant **OWNER grants explicitly**; reason + expiry + scoped permissions + full audit. Emergency override is Platform Super Admin-only and emits a security event. |
| 11 | Pricing | Configurable/versioned; nothing hard-coded. Pilot pricing TBD until infra cost + pilot feedback exist. |
| 12 | Order/GMV limits | **No GMV/order-volume limits initially.** Use resource/feature limits (staff seats, products, warehouses, advanced features) instead of penalizing sales volume. |
| 13 | Courier/payment entitlements | Core COD/payment + ≥1 courier available across paid plans; advanced/multi-integration can become higher-plan entitlements later. |
| 14 | Tenant DB migrations | Backward-compatible: canary → bounded batch → fleet. Destructive/locking/high-risk: announced maintenance window + tested rollback procedure. |
| 15 | Launch traffic target | Engineering targets: **50 active tenants · 500 concurrent users · ~100 req/s burst**. Re-baseline from pilot telemetry. |

**Self-service onboarding:** remains OFF until ~50 successful assisted provisionings (PO-018 reaffirmed).

---

## Engineering actions taken from these decisions

| Decision | Action shipped / status |
|---|---|
| #1 | Runbook drafted (`runbooks/backup-restore.md`) + `scripts/backup-tenant.sh` / `restore-tenant.sh` helpers so the drill executes day-one once a provider exists. Restore drill = THE production gate. |
| #2 | Same runbook encodes RPO/RTO/retention + separate-credentials requirement. |
| #3 | Already env-driven (`PLATFORM_PUBLIC_DOMAIN`). No code change needed. |
| #4 | Already adapter-separated (`PlatformBillingService`, control-plane-only ledgers). No change needed. |
| #5 | Recorded as the launch verification gate for ShippingService adapters. |
| #6 | **`R2Strategy` implemented** (`attachments/strategies/r2.strategy.ts`): S3-compatible endpoint, private bucket semantics, presigned GET (R2_PRESIGN_EXPIRES_SECONDS), keys via existing `tenantObjectKey()` → `tenants/{orgId}/…`; registered as `R2_STRATEGY` + factory mapping `r2`. New dep: `@aws-sdk/s3-request-presigner`. |
| #9 | Retention sweep AuditLog rule defaults to **2555 days** (config still overrides); sweep test updated. |
| #12 | Verified plan seed already ships `orders_per_month` with `limit: null` (unlimited) — metering continues for analytics, no volume penalty. Decision recorded on §9.1. |
| #14 | Bootstrapper hardening: per-migration `SET LOCAL lock_timeout` (30s) + `statement_timeout` (120s), env-overridable; `-- FERIO: NON_TRANSACTIONAL` marker support (runs outside BEGIN/COMMIT, recorded in ledger via new `non_transactional` column with lazy ledger upgrade). Canary→batch→fleet orchestration already matches policy. |

## Deferred-by-decision (documented, not forgotten)

- Managed provider selection → pre-pilot task; then compute real connection budget (brutal #3 follow-up).
- Production monitoring stack → pre-public-launch.
- Redis HA → pre-broader-launch.
- Pilot pricing → post-cost-baseline.
- Self-service onboarding → after ~50 assisted provisions.
