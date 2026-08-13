# Ferio Project Progress 54

**Checkpoint date:** August 13, 2026
**Milestone:** Customer BFF same-origin request enforcement
**Status:** State-changing Customer Web API requests now reject cross-site submission before reaching carts, checkout, account, review, warranty, service-booking, tracking, or payment-retry handlers

## Delivered

- Adds a centralized Next.js middleware boundary for all Customer Web `/api/*` routes.
- Allows read-only `GET` and `HEAD` requests plus `OPTIONS` preflight handling without changing existing API behavior.
- Requires unsafe requests to carry an exact matching `Origin` header or the browser's `Sec-Fetch-Site: same-origin` signal when `Origin` is omitted.
- Resolves the public request origin from normalized proxy host and protocol headers, with the Next.js request origin as a safe fallback.
- Rejects cross-site and origin-less non-browser mutations with a non-cacheable JSON `403` response.
- Covers authenticated cookie-backed account, review, and warranty mutations as well as cart, checkout, service-booking, tracking, and payment-retry submissions.

## Security Boundaries

- Same-site but cross-origin requests are rejected; this is an exact-origin policy rather than a broader registrable-domain policy.
- `SameSite=Lax` and HTTP-only customer cookies remain in place as complementary controls.
- Payment-provider success, failure, cancellation, IPN, and webhook callbacks remain backend endpoints and do not pass through this browser-only middleware.
- Server-to-server clients must call the NestJS API directly rather than Customer Web BFF mutation routes.

## Validation

| Project | Check | Result |
| --- | --- | --- |
| Customer Web | Production build | Passed; 34 pages generated and middleware compiled |
| Customer Web | Live middleware smoke test | Passed; missing and cross-site origins returned `403`, exact-origin and same-origin fetch metadata returned `200` |
| Repository | Diff whitespace validation | Passed |

## Operational Notes

- Reverse proxies must preserve the public `Host` or `X-Forwarded-Host` and protocol values used by Next.js.
- No database migration or backend deployment change is required.

## Recommended Next Work

1. Add browser-level login, refresh rotation, same-origin mutation rejection, account access, and logout tests against a running backend and Redis.
2. Add customer-controlled saved-address changes without mutating historical order snapshots.
3. Review Customer Web content-security and framing headers as the next browser-hardening layer.
