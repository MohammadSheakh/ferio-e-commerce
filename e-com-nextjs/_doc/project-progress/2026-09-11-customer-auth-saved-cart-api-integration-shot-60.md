# Customer Authentication and Saved Cart API Integration - Shot 60

**Date:** 2026-09-11
**Scope:** Customer authentication/session flows and saved-cart integration

## Findings

- Login and Google OAuth establish httpOnly access/refresh session cookies and
  automatically merge the host-owned guest cart when one exists.
- Email verification establishes the same session boundary; resend returns a
  safe message without exposing verification secrets.
- Logout revokes the refresh token upstream when available and clears the local
  session cookies even if the upstream request is unavailable.
- Session refresh rotates the refresh token and retries authenticated BFF calls;
  browser code never receives or selects the customer access token.
- Saved-cart create supports authenticated and guest flows through the existing
  BFF, while list/delete/save-to-account remain session-protected.
- Shared-cart read is host-forwarded and public; import carries the server-owned
  cart token and persists a returned cart token in the httpOnly cookie.
- Reorder uses the authenticated, ownership-checked BFF route and refreshes the
  active cart after the server response.

## Correction

The authentication documentation used `phone` in the registration example,
while the actual DTO and customer BFF use optional `phoneNumber`. The contract
example is corrected. Guest-cart merge is documented as an automatic login/OAuth
side effect rather than a browser-facing manual action.

## Validation

- Authentication, cart, saved-cart, customer-web callers, BFFs, and NestJS
  controllers were compared.
- Customer `pnpm api:check`: passed.
- `git diff --check`: passed.
- Redis was not changed.

## Remaining runtime evidence

Live cookie rotation/replay, OAuth provider behavior, guest-cart merge races,
share-token abuse/expiry, ownership denial, browser host forwarding, and
cross-tenant isolation still require runtime evidence.
