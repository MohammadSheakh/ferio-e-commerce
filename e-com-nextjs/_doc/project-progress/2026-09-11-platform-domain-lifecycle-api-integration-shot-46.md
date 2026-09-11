# API Integration Verification — Platform Domain Lifecycle (Shot 46)

**Date:** 2026-09-11  
**Scope:** Platform Admin organization detail domain lifecycle  
**Excluded:** `ferio-mobile-expo54/`; Redis configuration and implementation

## Finding

The platform backend exposed protected create, verify, primary, and disable domain
operations, and the platform catch-all BFF forwarded POST requests with the operator's
httpOnly session. The organization detail page only rendered the domain table and had no
frontend callers for those four documented APIs.

## Fix

- Added a platform session-backed domain action panel to the organization detail screen.
- Added custom-hostname registration with returned verification-token display/storage.
- Added per-domain verification-token submission and verify action.
- Added active-domain primary selection and disable actions.
- Preserved visible API/network error states and confirmation before disabling a domain.
- Documented the four domain lifecycle endpoints and the DNS/TLS operational boundary.

## Verification

- `pnpm api:check` in `ferio-platform-admin`: pass.
- `pnpm exec tsc --noEmit` in `ferio-platform-admin`: pass.
- `git diff --check`: pass.

The Nest runtime/OpenAPI startup was not used for this shot because the local Redis
endpoint is unavailable; Redis was not changed. Live DNS/TXT, TLS, host routing, cache
isolation, and browser evidence remain deployment/runtime gates.

