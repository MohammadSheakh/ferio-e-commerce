# Live Tenant Host Forwarding API Integration - Shot 71

Date: 2026-09-11

## Scope

This shot checks the local Docker-backed SSR/BFF path with two candidate tenant
hosts. The goal is to prove the fail-closed behavior available before
disposable tenants are provisioned.

## Evidence

- Local backend health returned HTTP 200 from `/api/v1/health`.
- The platform database query found no `TenantDomain` rows, so there are no
  provisioned positive tenant hosts in the current local environment.
- `alpha-a.ferio.sheakh.qzz.io` returned
  `{"code":"TENANT_RESOLUTION_FAILED"}` from
  `/api/v1/tenancy/status`.
- `alpha-b.ferio.sheakh.qzz.io` returned the same
  `TENANT_RESOLUTION_FAILED` state; neither host was treated as another
  tenant or silently downgraded to legacy mode.
- The customer web root returned HTTP 200 with the forwarded HTTPS headers and
  rendered the fail-closed `Store unavailable` page for `alpha-a`.
- Without the forwarded protocol, the direct container request redirected to
  the internal container hostname. This confirms that the tunnel/reverse proxy
  must supply the expected forwarded protocol and host headers.
- Public DNS currently resolves `ferio.sheakh.qzz.io`; the candidate
  `alpha-a` and `alpha-b` subdomains did not resolve in this environment.

## Assessment

The negative-path host forwarding and fail-closed SSR behavior are working.
Positive two-tenant browser/BFF isolation is not yet proven because the local
platform database has no provisioned tenant domains. The next runtime step is
to create disposable Alpha and Beta organizations through the real provisioning
flow, register their domains, then repeat SSR, refresh-cookie, cart, and
cross-tenant isolation checks.
