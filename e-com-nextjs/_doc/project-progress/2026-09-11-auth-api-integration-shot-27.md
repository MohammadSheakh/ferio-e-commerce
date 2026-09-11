# Auth API Integration Shot 27

Date: 2026-09-11

## Scope

Compared customer login, registration, email verification/resend, Google OAuth,
logout, refresh rotation, and protected-session BFF behavior with the NestJS
auth controllers and DTOs.

## Findings and changes

- Login, registration (`phoneNumber`), verification, resend, and Google OAuth
  payloads match the backend DTOs. The BFF sets Ferio access/refresh cookies
  server-side and merges an existing cart using the tenant-forwarded context.
- Refresh rotation uses the httpOnly refresh cookie, validates the replacement
  cookie, and clears the customer session on failed refresh. Logout invalidates
  the refresh token upstream and clears local cookies.
- Fixed frontend failure-state handling in login, registration, verification,
  resend, and Google OAuth: network errors or non-JSON responses now show a
  bounded message and always release the submitting/working state.
- Registration verification redirects now safely fall back to the submitted
  email if an otherwise successful response omits the optional data envelope.

## Verification

From `ferio-customer-web`:

```text
pnpm api:check  PASS
pnpm exec tsc --noEmit  PASS
pnpm lint  PASS (existing @next/next/no-img-element warnings only)
```

## Remaining runtime proof

Live checks still require the local app/PostgreSQL stack and staging DNS. The
next auth runtime evidence must cover cookie flags and rotation, invalid-token
logout, OAuth provider configuration, email delivery/OTP expiry, cart merge
ownership, CSRF/origin policy, and two-tenant host isolation.
