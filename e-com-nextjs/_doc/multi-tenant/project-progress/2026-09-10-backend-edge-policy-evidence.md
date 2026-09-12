# Backend Edge Policy Evidence

**Date:** 2026-09-10
**Scope:** Production tenant host trust configuration. Redis and `ferio-mobile-expo54/` were not changed.

## Remediation

- `docker-compose.production.yml` now requires `PLATFORM_PUBLIC_DOMAIN` and `TENANT_TRUSTED_PROXY_CIDRS` on the backend.
- It now requires `CUSTOMER_WEB_TRUSTED_PROXY` on Customer Web instead of allowing an accidental inherited/default value.
- `pnpm run check:tenant-edge-policy` validates the production contract before deployment.
- The validator rejects missing values, malformed domains, non-boolean forwarded-host policy, malformed CIDRs, and internet-wide `/0` proxy trust.
- `architecture:check` now guards the required Compose entries against regression.

## Verification

Executed from `e-com-nextjs/ferio-nest-prisma`:

```text
NODE_ENV=test pnpm run check:tenant-edge-policy
tenant_edge_policy_check=skipped_non_production

TENANT_EDGE_POLICY_ENV=production ... pnpm run check:tenant-edge-policy
tenant_edge_policy_check=passed

TENANT_TRUSTED_PROXY_CIDRS=0.0.0.0/0 ... pnpm run check:tenant-edge-policy
rejected as expected

pnpm run architecture:check
Architecture boundary check passed

pnpm run typecheck:application
passed

git diff --check
passed
```

## Honest boundary

This proves configuration fail-closed behavior only. It does not prove that the real Cloudflare tunnel peer CIDR, DNS, TLS, ingress overwrite behavior, production orchestration, or external security review is complete. Those remain deployment evidence gates.

## Regression result

After the remediation, the backend regression suite passed **142 suites and 645 tests**. Strict source lint, application lint, application typecheck, architecture checks, focused storage/tenancy tests (`39/39`), and diff checks also passed.
