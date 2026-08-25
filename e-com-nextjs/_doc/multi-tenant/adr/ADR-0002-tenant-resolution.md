# ADR-0002 — Host-Based Trusted Tenant Resolution

**Status:** ACCEPTED (PO-007: `{slug}.{FERIO_PUBLIC_DOMAIN}`) · **Date:** 2026-08-24

## Context

Every storefront/admin request must execute against exactly one tenant. Candidate resolution inputs:

- **Host header / server name** (Shopify-style `{tenant}.ferio.example` and later custom domains)
- URL path prefix (`/store/acme/...`) — leaks into every route, breaks SEO, ugly
- Client-supplied header/cookie/body value (`X-Tenant-Id`, `tenantId` in JWT claims alone, query param) — trivially forgeable
- Subdomain of a platform domain with wildcard DNS/TLS

## Decision

Resolve tenants **only from the request host**, validated against the control-plane `TenantDomain` registry:

1. Normalize host: lowercase, strip port and trailing dot; reject malformed hosts (length, character set, IP-literal).
2. Exact-match against an active `TenantDomain` record (covers both `*.ferio.<domain>` subdomains and verified custom domains).
3. Fail closed: unknown domain → stable `TENANT_RESOLUTION_FAILED` / unknown-domain error; inactive/unverified/suspended per policy → `TENANT_UNAVAILABLE`. **No fallback to the legacy single-tenant database, ever.**
4. Produce an immutable, request-scoped `TenantContext` (organization ID, domain ID, DB registry ID, subscription state) via AsyncLocalStorage; services read context, never raw hosts.
5. Cache positive resolutions under the exact hostname key with short TTL + explicit invalidation on domain/status change; cache negative lookups briefly to blunt enumeration.
6. Background jobs, sockets, and BFF calls carry only the trusted `tenantDatabaseId`/`organizationId` envelope — workers re-validate against the control plane before touching a tenant database.

**Prohibited:** any request body/query/header selecting a tenant or database directly; any code path falling back to `DATABASE_URL` when resolution fails.

Development mapping: a dev-host table (`*.localhost:port` → seeded test orgs) is allowed behind explicit env flags without weakening production behavior.

## Consequences

**Positive:** one resolution point to audit; custom domains slot in without route changes; SSR/BFF/jobs all share one trusted mechanism.
**Negative/obligations:** wildcard DNS/TLS is an infrastructure dependency (owner-blocked decision); middleware ordering is critical — resolution must precede auth guards that depend on membership; host-spoofing tests become mandatory CI security cases.

## Alternatives rejected

- Path-prefix tenancy: rejected (SEO, cookie scoping, DX).
- Trusting client-supplied tenant identifiers: rejected outright — violates PRD engineering principle 7 ("clients must never choose a database").
