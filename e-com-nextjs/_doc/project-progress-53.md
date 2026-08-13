# Ferio Project Progress 53

**Checkpoint date:** August 13, 2026
**Milestone:** Customer session refresh and revoking logout
**Status:** Customer account, review, and warranty actions now use rotating HTTP-only sessions and visible logout instead of failing when the 15-minute access token expires

## Delivered

- Replaces the Customer Web login proxy’s access-only cookie with separate HTTP-only access and refresh cookies.
- Extracts the backend refresh cookie only inside the Next.js route handler; refresh tokens are never returned to browser JavaScript.
- Adds a shared server-only Customer Web session helper for authenticated backend calls.
- Refreshes a missing or expired access token through the existing backend rotation endpoint.
- Retries an authenticated request once after a backend `401`, using the newly rotated access token.
- Clears both customer cookies when refresh is definitively rejected.
- Adds `POST /api/account/logout`, forwards the refresh token to backend revocation, and always clears local cookies.
- Adds a visible restrained `Sign out` action on the customer order-history page.
- Applies the same session behavior to account-commerce, YouTube review submission, and warranty read/upload/claim proxies.
- Preserves a safe relative post-login redirect and rejects external redirect values.

## Security Boundaries

- Access and refresh cookies are `HttpOnly`, `SameSite=Lax`, path `/`, and `Secure` in production.
- Access cookies expire after 15 minutes; refresh cookies expire after seven days, matching the existing backend defaults.
- Refresh tokens rotate on every successful refresh and the prior token is blacklisted by the backend.
- Browser JavaScript receives only safe user data or normal API responses, never either token.
- Authenticated requests retry at most once, preventing refresh loops.

## Validation

| Project | Check | Result |
| --- | --- | --- |
| Customer Web | Production build | Passed; 34 pages generated |
| Backend | Full unit suite | Passed; 31 suites and 105 tests |
| Backend | Production build | Passed |
| Repository | Diff whitespace validation | Passed |

## Operational Notes

- Redis must be available for durable refresh-token blacklist enforcement; without Redis the browser session is cleared, but server-side revocation evidence cannot be stored by the existing backend service.
- The customer session helper uses the backend’s current `/auth/refresh` and `/auth/logout` contracts and introduces no database migration.
- OAuth and registration UI are not expanded by this checkpoint.

## Recommended Next Work

1. Add browser-level customer login, refresh rotation, account access, and logout tests against a running backend and Redis.
2. Add CSRF-origin enforcement for state-changing cookie-backed Customer Web BFF routes as defense in depth.
3. Add customer-controlled saved-address changes without mutating historical order snapshots.
