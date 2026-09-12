# Customer/Admin Session Refresh API Integration Shot 69

Date: 2026-09-11
Scope: customer and tenant-admin refresh rotation, logout, token-expiry retry, and tenant binding.

## Finding and fix

The backend refresh service rejects a refresh token when tenancy is enabled and
the token organization does not match the resolved tenant context. Tenant-admin
refresh already forwarded the normalized tenant host, but customer refresh only
sent the refresh cookie and correlation ID. Customer refresh now also forwards
the resolved host headers from `hostForwardHeaders()`.

Both web planes were then rechecked:

- Customer `customerSessionFetch` obtains/rotates a server-side access/refresh
  cookie pair, retries one original request after a 401, and preserves tenant
  host/correlation headers on refresh and retry.
- Tenant-admin `adminApi` performs the same one-refresh retry and already sends
  normalized tenant host context during refresh and requests.
- Customer and tenant-admin logout routes call backend `POST /auth/logout` with
  the refresh cookie before clearing local httpOnly cookies.

## Validation

- `ferio-customer-web`: `pnpm api:check` passed.
- `ferio-customer-web`: TypeScript passed.
- `ferio-customer-web`: lint and production build passed with existing image
  optimization warnings.
- `ferio-admin-dashboard/ferio-admin`: `pnpm api:check` passed.
- `ferio-admin-dashboard/ferio-admin`: TypeScript passed.
- `ferio-admin-dashboard/ferio-admin`: lint and production build passed with
  existing image and hook-dependency warnings.

## Boundary

This closes source-level refresh/logout tenant-context integration. It does not
claim live browser cookie rotation, Redis blacklist availability/fairness,
refresh-token replay races, identity-provider behavior, or cross-tenant runtime
evidence.
