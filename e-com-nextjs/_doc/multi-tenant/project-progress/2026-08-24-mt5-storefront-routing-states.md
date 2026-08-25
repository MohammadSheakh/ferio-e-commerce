# Project Progress — MT-5: Tenant-Aware Storefront Routing and Full-Page States

**Date:** August 24, 2026 (third increment)
**Scope:** Release MT-5 core — host routing through the BFF, public tenancy status contract, and the three tenant storefront states, built to the Ferio design language.

---

## What landed

### 1. Proxied-host resolution (backend)

Storefront traffic reaches the backend through the Next.js BFF, so the backend can no longer rely on its own `Host` header (that's the proxy's). Now:

- `TenantContextMiddleware` prefers `x-forwarded-host` over the proxy-local hostname.
- New public `effectiveHostFrom()` helper shares the same precedence for non-middleware callers.
- `/api/v1/tenancy/(.*)*` is excluded from the tenant middleware itself (the status endpoint must answer *before* a store exists).

### 2. Public tenancy status contract

`GET /tenancy/status` returns only safe metadata:

| Payload | Meaning |
|---|---|
| `{ code: 'LEGACY' }` | Tenancy disabled upstream — storefront renders normally |
| `{ code: 'ACTIVE', storeName }` | Resolved store; display name from control-plane metadata until MT-7 routes settings reads per tenant |
| `{ code: 'TENANT_RESOLUTION_FAILED' }` etc. | Stable codes the storefront maps to full-page states |

No registry IDs, internal hosts, or credentials ever cross this boundary. Unexpected resolver failures rethrow rather than inventing states.

### 3. Storefront gating without client-bundle contamination

First attempt failed the production build: `lib/backend.ts` sits in both server and client graphs, so importing `next/headers` there poisoned client pages. Final architecture:

- **`lib/host-forward.ts`** — provider pattern with zero framework imports; safe in every bundle; returns `{}` on the client.
- **`instrumentation.ts`** — node-runtime bootstrap registers the real provider (`x-forwarded-host` ?? `host` from `next/headers`).
- All server-side BFF fetch helpers (`getPublicApi`, `cartApi`, `customerSessionFetch`) attach forwarded-host headers automatically. Route handlers needed zero changes.

### 4. Root-layout gate + design-language state screens

The Customer Web root layout asks the backend for status before rendering anything:

- Non-active hosts render a full-page state **instead of** header/footer/catalog chrome — no tenant data fetches occur at all.
- Three states shipped per `_doc/design-language.md` (paper background, ink type, hairline divider, single pill action, plain direct copy, no icons/shadows/gradients):
  - **Unknown address** — "No store exists at this address." (no action button; recovery is fixing the URL)
  - **Suspended / closed** — calm closure notice, existing-orders reassurance
  - **Unavailable / maintenance** — provisioning, unhealthy DB, or migration-in-progress all map here ("will be back shortly")
- LEGACY and ACTIVE fall through untouched; legacy deployments see zero change.

## Verification

- Backend build clean; **68 suites / 271 unit tests passing** (+1 suite): forwarded-host precedence, LEGACY short-circuit, every stable code mapping, unexpected-failure rethrow.
- Customer Web: `tsc --noEmit` clean, production build passes (the earlier `next/headers`-in-client failure is structurally impossible now).

## Checklist movement

MT-5 items marked: canonical hostname format ✔, reserved subdomains ✔ (from MT-1), SSR-resolves-before-fetching ✔, unknown/provisioning/suspended pages ✔, dev strategy PARTIAL, SEO metadata PARTIAL.

## Next

1. **MT-5 completion**: wildcard DNS/TLS remains owner-blocked; canonical redirects and cache/CDN leak checks when infrastructure lands.
2. **MT-7 begins**: first commerce module (catalog public reads) migrated behind `TenantDbService`, then admin writes; each module keeps its unit suite green plus a two-tenant isolation case where financial data is involved.
3. MT-4 gate proof (provision → ready → serve) once a CI runner provides disposable PostgreSQL with CREATE DATABASE rights.

## Owner-blocked dependencies touched

Wildcard DNS/TLS strategy (blocks real multi-host verification); custom-domain certificate automation (P1).
