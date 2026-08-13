# Ferio Project Progress 55

**Checkpoint date:** August 13, 2026
**Milestone:** Customer registration, email verification, and secure Google sign-in
**Status:** Customers can now create an account, verify their email into an authenticated session, sign in with a password, or use a cryptographically verified Google identity

## Backend Audit Result

- Email registration, OTP creation, and an OAuth endpoint existed before this checkpoint.
- Customer Web exposed only password sign-in, so a new customer had no registration path.
- The existing Google and Apple token verifier returned hard-coded development identities and was not safe to expose.
- Generic OTP verification consumed a code but did not mark the user verified or create a customer session.
- The existing `OAuthAccount` model was available but authentication did not use it to preserve provider identity.

## Delivered

- Replaces mocked Google token handling with Google's official ID-token verifier and configured audience validation.
- Requires a Google identity to contain a verified email and uses the immutable Google subject as provider identity.
- Links Google identities through the existing unique `OAuthAccount` relation instead of relying on email during every login.
- Allows a verified Google email to safely link an existing customer account, while refusing Customer Web OAuth for staff accounts.
- Removes Apple from the accepted public OAuth DTO until real Apple verification is implemented.
- Adds email-verification and resend endpoints with strict validation and auth rate limits.
- Marks a customer email verified only after the Redis-backed six-digit code succeeds, then issues access and rotating refresh tokens immediately.
- Rejects password login for unverified customer accounts only after the submitted password has been validated.
- Keeps verification resend responses account-enumeration resistant.
- Adds Customer Web BFF routes for registration, verification, resend, and Google session exchange.
- Reuses the existing HTTP-only access/refresh cookie lifecycle for password, verified-email, and Google sessions.
- Adds polished responsive sign-in, registration, and verification screens following the Ferio design language.
- Adds visible `Create account` and `Sign in / Account` navigation entry points.
- Auto-fills a development-only verification code when the backend explicitly returns it outside production.
- Excludes account pages from search indexing.

## Security Boundaries

- The browser sends a Google ID token to the same-origin Customer Web BFF; tokens are verified by NestJS, not trusted client-side.
- The configured Google audience must match the frontend Google client ID.
- OAuth does not store Google access, refresh, or ID tokens in PostgreSQL.
- All Customer Web auth mutations remain protected by the exact same-origin middleware.
- Staff accounts cannot be converted into Customer Web Google sessions.
- Guest checkout remains available; registration is not forced for purchasing.

## Production Configuration

- Set the same Google Web client ID as backend `GOOGLE_CLIENT_ID` and Customer Web `NEXT_PUBLIC_GOOGLE_CLIENT_ID`.
- Add the Customer Web HTTPS origin to the Google OAuth client's authorized JavaScript origins.
- Configure Redis for verification codes and refresh-token revocation.
- Configure SMTP variables so production verification emails can be delivered.
- No Google redirect URI is required by this popup ID-token flow.

## Validation

| Project | Check | Result |
| --- | --- | --- |
| Backend | Google token-verifier unit tests | Passed; 3 tests |
| Backend | Full unit suite | Passed; 32 suites and 108 tests |
| Backend | Production build | Passed |
| Customer Web | Production build | Passed; 40 pages generated and middleware compiled |
| Repository | Diff whitespace validation | Passed across the root workspace and nested backend repository |

## Operational Notes

- Existing local customer accounts can attach Google when Google's verified email exactly matches the account email.
- Existing unverified registrations can use the new verification or resend screen.
- This checkpoint reuses the existing Prisma schema and requires no migration.

## Recommended Next Work

1. Configure a Google Web client, SMTP, Redis, and public HTTPS origins, then run a real browser registration and Google-sign-in smoke test.
2. Add forgot-password and reset-password Customer Web screens using the existing backend endpoints.
3. Add browser automation for registration, verification, login, refresh rotation, Google sign-in, and logout.
