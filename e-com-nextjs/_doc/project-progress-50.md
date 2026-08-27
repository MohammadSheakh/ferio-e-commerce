# Ferio Project Progress 50

**Checkpoint date:** August 13, 2026
**Milestone:** Purchase-activity PostgreSQL integration coverage
**Status:** A real-Prisma integration suite now specifies the privacy, truthfulness, aggregation, locality, and pagination behavior against disposable PostgreSQL

## Delivered

- Adds `test/purchase-activity.integration-spec.ts` using the established `TEST_DATABASE_URL`, `PrismaPg`, and test-database name guard conventions.
- Proves public toast and history surfaces return no records while their individual settings are disabled.
- Proves only explicitly consented `DELIVERED` or `COMPLETED` orders inside the configured age window qualify.
- Proves excluded products do not appear or inflate the public `+N items` count.
- Proves one order produces one activity record with a lead product and aggregated visible quantity.
- Proves Bengali names are Unicode-safe and masked to the first character.
- Proves local area takes precedence when enabled and district is used when area visibility is disabled.
- Proves pagination counts and pages orders rather than individual order items.
- Seeds contact and detailed-address data while asserting the public result contract exposes only the permitted masked/locality fields.

## Validation

| Project | Check | Result |
| --- | --- | --- |
| Backend | Isolated TypeScript compilation of new integration suite | Passed |
| Backend | Full unit suite | Passed; 29 suites and 100 tests |
| Backend | Production build | Passed |
| Backend | Live PostgreSQL integration execution | Not run; `TEST_DATABASE_URL` is not configured in this workspace |
| Repository | Diff whitespace validation | Passed |

## Operational Notes

- Run `TEST_DATABASE_URL=postgresql://.../ferio_test pnpm test:integration -- purchase-activity.integration-spec.ts` only against a migrated disposable database whose name contains `test`.
- The suite truncates commerce settings, customer, cart, delivery-zone, and category roots with cascading cleanup before fixture creation.
- No production schema or API changes are introduced by this checkpoint.

## Recommended Next Work

1. Configure a disposable PostgreSQL integration database, deploy migrations, and execute the new suite live.
2. Expand mixed Bangla/English name and address coverage across checkout, order placement, tracking, and warranty flows.
3. Continue Release 1 hardening with browse-to-COD and browse-to-prepaid end-to-end coverage.

==============================

# Ferio Project Progress 51

**Checkpoint date:** August 13, 2026
**Milestone:** Admin customer profiles and delivered-order context
**Status:** Operations can search customer records, inspect delivered outcomes and order history, and move directly between order and customer context

## Delivered

- Adds guarded Admin endpoints at `GET /admin/customers` and `GET /admin/customers/:id`.
- Adds paginated search across customer name, normalized/source phone, and email.
- Masks phone and email in the customer list while keeping full contact details inside the authenticated profile detail.
- Shows total orders, delivered/completed count, delivered spend, cancellations, returns, RTO count, and last delivered purchase.
- Shows the latest source, medium, and campaign attribution without presenting missing attribution as known data.
- Adds deterministic evidence labels for RTO history, cancellation rate of at least 50% after three orders, and multiple return cases.
- Avoids an opaque trust score and explicitly states that attention indicators do not automatically block checkout or decide identity.
- Adds reusable saved-address context while preserving historical order-address snapshots separately.
- Adds a bounded latest-50 order history with lifecycle, payment, destination, item count, total, and links to detailed orders.
- Links customer names in the Admin order queue directly to customer profiles.
- Replaces the previous placeholder Customers page with a responsive, restrained table and detail layout following the Ferio design language.

## Metric Definitions

- **Delivered orders:** Orders currently in `DELIVERED` or `COMPLETED` state.
- **Delivered spend:** Sum of current order totals for `DELIVERED` and `COMPLETED` orders; this is not profit or contribution.
- **Returns:** Orders whose return status is not `NONE`.
- **Last purchase:** Most recent `DELIVERED` or `COMPLETED` order date.
- **RTO history:** Orders whose shipment status is `RTO`.

## Validation

| Project | Check | Result |
| --- | --- | --- |
| Backend | Full unit suite | Passed; 30 suites and 102 tests |
| Backend | Production build | Passed |
| Admin Web | Production build | Passed; 61 pages generated |
| Repository | Diff whitespace validation | Passed |

## Operational Notes

- Customer lists expose masked contacts by design; full values remain available only through the authenticated detail endpoint.
- The order history response is capped at 50 records and reports when additional history exists.
- The feature is read-only and introduces no schema migration.
- Duplicate-customer merge, deletion/suppression requests, and customer-lifetime contribution remain separate policy-dependent work.

## Recommended Next Work

1. Add customer-profile database integration coverage for aggregate metrics and masking.
2. Add reviewed, audited duplicate-profile merge only after identity-conflict rules and staff permissions are approved.
3. Add customer data-access/correction/suppression workflows after retention and deletion periods are approved.

==============================

# Ferio Project Progress 52

**Checkpoint date:** August 13, 2026
**Milestone:** Explicitly linked customer account and previous-order history
**Status:** Signed-in customers can securely link one commerce profile and view its previous orders without Ferio inferring identity from similar contact data

## Delivered

- Adds an optional unique one-to-one relation between authentication `User` and commerce `Customer` records.
- Adds authenticated `GET /account/commerce` and `POST /account/commerce/link` endpoints.
- Requires an exact order reference plus normalized checkout phone before linking purchase history.
- Uses a constant-style `Order could not be verified` failure for both unknown references and phone mismatches to reduce order-enumeration leakage.
- Prevents an account from relinking to another customer and prevents one customer profile from linking to multiple accounts.
- Never links accounts based only on email similarity, phone similarity, or display name.
- Adds `/account/orders` with signed-out guidance, explicit linking form, latest 50 orders, product lines, totals, payment/lifecycle status, destination, courier tracking, and saved addresses.
- Reports when more than 50 historical orders exist rather than silently implying the list is complete.
- Adds direct customer navigation to account orders and warranty claims from the site header/footer and account screen.
- Updates sign-in copy and applies a safe same-site relative redirect after successful login.

## Validation

| Project | Check | Result |
| --- | --- | --- |
| Backend | Prisma schema build and client generation | Passed |
| Backend | Full unit suite | Passed; 31 suites and 105 tests |
| Backend | Production build | Passed |
| Customer Web | Production build | Passed; 33 pages generated |
| Repository | Diff whitespace validation | Passed |

## Security and Identity Rules

- The link proof is possession of both the order reference and the exact checkout phone.
- Account and customer links are unique in PostgreSQL and checked before update.
- Historical order-address records remain immutable and separate from reusable saved addresses.
- Full order history is available only behind the customer access token.
- This workflow does not merge duplicate commerce customers; merge remains a reviewed Admin operation requiring approved identity-conflict rules.

## Operational Notes

- Deploy migration `20260814033000_explicit_account_customer_link` to target PostgreSQL.
- Existing users and customers remain unlinked until the customer completes explicit verification.
- Customer access cookies currently follow the existing 15-minute access-token lifetime; refresh/session improvements remain separate authentication work.
- Registration and email-verification UX remain inherited from the existing backend and are not expanded by this checkpoint.

## Recommended Next Work

1. Add account logout and secure access-token refresh so customer sessions are operationally complete.
2. Add customer-controlled saved-address updates without changing historical order snapshots.
3. Add database integration coverage for concurrent account-link attempts and unique-link enforcement.

================================

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

============================

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


===================================

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


=======================================

# Ferio Project Progress 56

**Checkpoint date:** August 13, 2026
**Milestone:** Checkout idempotency compatibility fix
**Status:** COD and prepaid order placement no longer depend on secure-context-only `crypto.randomUUID()` support

## Root Cause

- The checkout page created its order idempotency key with `window.crypto.randomUUID()`.
- Browsers expose `randomUUID()` only in secure contexts, so the HTTP deployment at `http://ferio.sheakh.qzz.io` could load checkout but failed before submitting an order.
- The failure affected both COD and prepaid placement because they share the same order-creation path.

## Delivered

- Adds a reusable browser idempotency-key generator.
- Prefers native `crypto.randomUUID()` when the browser and origin support it.
- Falls back to UUID v4 generation using `crypto.getRandomValues()` when `randomUUID()` is unavailable.
- Provides a timestamp-plus-random compatibility fallback for legacy browsers without Web Crypto.
- Preserves the generated key in session storage, retaining safe retry and duplicate-order protection.
- Keeps the backend's existing 16–200 character idempotency-key contract unchanged.

## Validation

| Project | Check | Result |
| --- | --- | --- |
| Customer Web | Production build | Passed; 40 pages generated and middleware compiled |
| Customer Web | Idempotency-key branch smoke test | Passed; native UUID, Web Crypto UUID v4, and legacy compatibility paths |
| Repository | Diff whitespace validation | Passed |

## Operational Note

- Production checkout should still be served over HTTPS for cookie, transport, OAuth, and browser-security guarantees. This compatibility fallback fixes order placement on the current HTTP test deployment but is not a substitute for HTTPS.
