# Project-Flow Runtime Validation — Shot 20

Date: 2026-09-11

## Scope

Advance the supported provisioning flow and run local two-host SSR/BFF checks
with disposable tenant organizations.

## Corrections

- Local PostgreSQL provisioning now grants tenant-role `USAGE` and `CREATE`
  privileges on the new database's `public` schema before migrations.
- Persistent backend secret storage is mandatory; the runtime no longer falls
  back to an ephemeral secret directory.
- Server-side customer-web requests prefer the internal `FERIO_API_URL`, while
  browser requests retain the public API URL.
- The customer image grants its non-root runtime user access to `.next/cache`.

## Evidence

- Beta and replacement Gamma were created and provisioned through the
  platform API.
- Both completed all nine provisioning steps, including 51 migrations,
  baseline seed, health check, smoke test, and activation.
- Both have active local domains and ready tenant databases.
- Host-aware tenancy status returned distinct active store identities.
- SSR requests for both hosts returned HTTP 200 with the normal storefront
  page and no `Store unavailable` response.
- No `.next/cache` permission errors appeared after the image fix.

## Boundary

This closes the local internal host-routing and SSR/BFF connectivity proof. It
does not claim public Cloudflare DNS/TLS, browser cookie separation, populated
catalog/order isolation, pilot operation, or managed-provider recovery.
