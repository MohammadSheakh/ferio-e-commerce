# CI Boundary Gates Evidence

**Date:** 2026-09-11
**Scope:** Repository CI regression coverage for backend tenancy contracts and web lint.
**Explicit exclusions:** `ferio-mobile-expo54/` and Redis implementation/configuration.

## Change

The root GitHub Actions workflow now runs the backend tenant-context inventory,
architecture boundary, PostgreSQL connection-budget, and production tenant-edge
policy checks before backend build/test execution. The customer web, platform
admin, and merchant admin jobs now run their existing ESLint commands alongside
OpenAPI drift, TypeScript, and production-build checks.

The edge-policy step uses a deliberately non-production example hostname and a
loopback CIDR only to validate the configuration contract. It does not claim
that the real Cloudflare tunnel, DNS, ingress peer range, or TLS deployment is
available.

## Validation

Local backend gates passed:

```text
pnpm run check:tenant-context-boundaries
Tenant context boundary check passed: 12 entry points inventoried.

pnpm run architecture:check
Architecture boundary check passed: Prisma tenancy boundary and production overlay are present.

pnpm run check:connection-budget
theoreticalConnections=90, usableConnections=90, withinBudget=true

TENANT_EDGE_POLICY_ENV=production TENANCY_ENABLED=true
PLATFORM_PUBLIC_DOMAIN=ferio.example CUSTOMER_WEB_TRUSTED_PROXY=false
TENANT_TRUSTED_PROXY_CIDRS=127.0.0.1/32 pnpm run check:tenant-edge-policy
tenant_edge_policy_check=passed
```

The workflow YAML parsed successfully. Web lint was also run locally for all
three web applications and exited successfully. Customer and merchant admin
retain existing non-blocking image/hook warnings; platform admin reported no
warnings or errors.

## Release interpretation

This improves CI regression detection for repository-level contracts. It does
not close browser E2E, live two-host SSR/BFF, managed recovery, scale,
provider-delivery, pilot, or formal security acceptance gates.
