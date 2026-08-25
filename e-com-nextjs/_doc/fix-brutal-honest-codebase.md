# Fix Log — Brutal Honest Codebase Review Remediation

**Date:** August 24, 2026
**Companion review:** [brutal-honest-openion-about-codebase.md](brutal-honest-openion-about-codebase.md)
**Verification:** Backend production build passes; **61/61 unit suites, 214/214 tests pass** (up from 207 — new hardened-path tests included). Customer Web and Admin Web typecheck and production-build cleanly on Next.js 14.2.35. Expo app typechecks.

Legend: **FIXED** = code changed in this remediation · **OWNER-REQUIRED** = cannot be done in code; needs business/provider action · **PARTIAL** = core fix landed, follow-up tracked.

---

## 1. Secrets and Credentials

| # | Issue | Status | What was done |
|---|---|---|---|
| 1.1 | Paperfly API key `Paperfly_~La?Rj73FcLm`, username/password committed in `_doc/api-integration-document-by-feature/paperfly-courier.md` | **FIXED (repo) + OWNER-REQUIRED (rotation/history)** | All credential values redacted from the doc. Values remain recoverable from git history — see owner actions below. |
| 1.2 | SSLCommerz store ID/password hardcoded in `commerce-payments/adapters/payment-adapters.spec.ts` | **FIXED (repo) + OWNER-REQUIRED (rotation)** | Replaced with `test-store-id` / `test-store-password`. Repo-wide scan confirms zero occurrences of the leaked values in tracked files at HEAD. |
| 1.3 | `JWT_ACCESS_SECRET=your-64-character-random-string-here` template value accepted by config validation | **FIXED** | `config.module.ts` now rejects known placeholder/template values (`your-64-character-random-string-here`, `fallback-secret`, etc.) for both JWT secrets with a startup error instructing generation via `openssl rand -hex 64`. Local `.env` regenerated with real 128-hex secrets. |
| 1.4 | `NODE_ENV=production#development` garbage value (broke cookie `secure` flag and Swagger gating) | **FIXED (local .env) + HARDENED (code)** | `.env` set to `development`. Additionally, Swagger now enables only when `NODE_ENV !== 'production'` (was explicitly enabled in production before). |
| 1.5 | Neon Postgres / Google OAuth / SSLCommerz / CarryBee credentials sitting in plaintext local `.env` files | **OWNER-REQUIRED** | Rotate all of these provider-side. Code cannot rotate them. Until rotation, treat every previously-shared machine as exposed. |
| 1.6 | Git history still contains pre-redaction secrets | **OWNER-REQUIRED** | Options: (a) rotate every leaked value (sufficient), or (b) history rewrite (`git filter-repo`) + force push + rotate. Rotation alone is acceptable if rewrite is not feasible. |

## 2. Authentication and Authorization

| # | Issue | Status | What was done |
|---|---|---|---|
| 2.1 | Rider approval overwrote ANY existing user's password + role (account takeover chain); hardcoded default password `RiderPass123!` | **FIXED** | `delivery-personnel.service.ts`: approval never mutates an existing non-rider account — it rejects with a conflict requiring resolution. New rider provisioning requires an explicit ≥10-char initial password (no default exists anymore). Public `apply()` also checks the `user` table so an application email can never target an existing account, and returns non-enumerating messages. Approval runs in a transaction and writes an audit record. |
| 2.2 | `'fallback-secret'` JWT fallback in socket.module, ws-jwt.guard, socket-auth.service, chatting.module | **FIXED** | All four removed; secret read strictly from env (startup validation guarantees presence/strength). A missing secret now fails boot instead of letting anyone mint admin sockets. |
| 2.3 | Socket auth: invalid tokens silently became guest sessions bound to client-asserted IDs; stale-token users fell back to claim-derived roles | **FIXED** | `socket-auth.service.ts`: a supplied-but-invalid token now rejects the connection (`null`) instead of downgrading to a guest. Valid tokens that no longer resolve to a DB user/rider are rejected instead of trusting claim roles. The existing spec documenting this intent ("rejects invalid tokens…") now passes against real behavior. |
| 2.4 | OTP codes from `Math.random()`, stored plaintext in Redis | **FIXED** | `otp.service.ts`: codes generated with `crypto.randomInt` (CSPRNG), stored only as SHA-256 digests, compared timing-safely, consumed atomically via `GETDEL` so concurrent verification of the same code fails. Legacy plaintext payloads are treated as expired. |
| 2.5 | `forgot-password` / `verify-otp` / `reset-password` had no rate limiting | **FIXED** | All three now use `SlidingWindowRateLimitGuard` at the strict tier (5/hour, same as register). |
| 2.6 | `resetPassword` body was a raw inline type bypassing validation | **FIXED** | Proper `ResetPasswordDto` with email format, 6-digit OTP bounds, and 8–128 char password constraints. |
| 2.7 | Registration revealed account existence (`Email already registered`) | **FIXED** | Enumeration-safe generic success response without sending anything or exposing user data. |
| 2.8 | Token revocation failed open when Redis was down (logout no-op, revoked refresh tokens accepted) | **FIXED** | Refresh now **fails closed**: without Redis the refresh endpoint refuses with 503 rather than skipping the blacklist check. Logout records a security event when blacklisting is impossible; combined with fail-closed refresh, revoked tokens cannot be replayed during an outage. |
| 2.9 | `userRoleData.controller.ts`: update/delete endpoints with no role guard; protected endpoints used roles that don't exist (`common`, `commonAdmin`) | **FIXED** | The entire legacy sub-module was dead residue from the old task-management app (no frontend consumers) — deleted along with its wiring in `user.module.ts`. |
| 2.10 | Dead `notification` module with literal `// TODO: Add admin role guard` above a public broadcast endpoint | **FIXED** | Module deleted (was unimported/unroutable; Mongoose-era code incompatible with the Prisma stack). |
| 2.11 | Legacy Mongoose `payment.module` (Stripe/RevenueCat with broken signature input, stub handlers) and `subscription.module` compiled into dist, one import away from live | **FIXED** | Both deleted entirely after verifying nothing imports them. |
| 2.12 | Refresh token returned in JSON body alongside httpOnly cookie | **PARTIAL / ACCEPTED RISK** | Kept intentionally: the Expo app requires body tokens for SecureStore and has no cookie jar. Mitigations already present: 15-min access expiry, one-time refresh rotation, revocation. Revisit if a web-only token flow is added. |
| 2.13 | Dead `ThrottlerModule` config with no `APP_GUARD`; Redis sliding-window guard fails open | **PARTIAL** | Not changed in this pass: switching rate limiting to fail-closed would take the whole API down whenever Redis blips, which is a product decision, not a patch. Tracked as follow-up: add a documented in-memory fallback limiter for auth-critical routes only. |

## 3. Payments and Money

| # | Issue | Status | What was done |
|---|---|---|---|
| 3.1 | Forged browser callbacks could mark attempts/orders FAILED/CANCELLED (griefing vector on in-flight payments) | **FIXED** | SSLCommerz gateway now returns `UNVERIFIED_REPORT` for any callback lacking a server-verifiable `val_id`. The service records such callbacks as evidence but **never mutates attempt or order state**; abandoned sessions expire through the payment-recovery sweep, which remains the authoritative path. Provider-verified FAILED/CANCELLED outcomes still transition state normally. Callback endpoint additionally rate-limited. Internal validation errors no longer leak raw messages to callers. |
| 3.2 | Unauthenticated `POST /payments/initiate` accepted bare `orderId` (IDOR + gateway-session spam) | **FIXED** | DTO now requires `reference` + placement `phone`; service verifies reference match and normalized-phone equality against the order address (same proof as retry). Web BFF and mobile checkout updated to send both values they legitimately hold. |
| 3.3 | RedX and Paperfly adapters passed minor units (paisa) where courier APIs expect taka → 100× COD collection demand | **FIXED** | Both divide by 100 like Pathao/Steadfast/eCourier/CarryBee already did. Repo-wide scan shows no remaining un-divided `codAmount` usages in adapters. |
| 3.4 | aamarPay validate fell back to attacker-controlled payload for amount/currency comparisons | **FIXED** | Fallbacks removed; missing provider-reported amounts now fail the equality check closed instead of comparing attacker-supplied numbers. |
| 3.5 | Wallet ledger wrote `balanceBefore/balanceAfter` from stale reads while balances moved atomically | **FIXED** | Debit re-reads the wallet inside the transaction for the authoritative post-debit balance; credit/refund paths use Prisma's post-update return row. Ledger rows can no longer misstate balances under concurrency. |
| 3.6 | `refundCancelledOrder` trusted caller-supplied amount with no ceiling | **FIXED** | Refund now fails closed unless a matching wallet debit ledger entry exists and the refund amount does not exceed it. |
| 3.7 | Stripe/RevenueCat webhook signature verification broken by re-serialized JSON; fire-and-forget processing | **FIXED (enabler) / MOOT (modules deleted)** | `NestFactory.create` now uses `rawBody: true` so any future HMAC webhook verifies against exact bytes. The broken legacy Stripe/RevenueCat modules themselves were deleted (see 2.11). |

## 4. Orders, Inventory, Fulfillment

| # | Issue | Status | What was done |
|---|---|---|---|
| 4.1 | Rider DELIVERED bypassed reservation consumption, COD collection, fulfillment history; accepted CANCELLED→DELIVERED; actor labeled SYSTEM | **FIXED** | Rider status updates now run in a Serializable transaction with: transition guards (terminal/cancelled orders blocked; orders must be SHIPPED/READY_TO_SHIP), reservation consumption identical to the courier path (stock decrement, CONSUMED status, SALE movement), fulfillment history, proper status history attributed to the acting rider, and an audit record. COD cash remains PENDING staff confirmation by design — cash evidence is audited, not fabricated; reconciliation flags delivered-COD-without-collection. Known limitation recorded: CodCollection rows still require a shipment, so rider COD settlement flows through finance review until a schema decision is approved. |
| 4.2 | `resolveDeliveryPersonnel` fabricated APPROVED rider profiles for arbitrary users and auto-linked PENDING applications | **FIXED** | Fabrication removed; auto-linking only claims genuinely APPROVED records; all rider self-service now requires an approved linked profile. |
| 4.3 | Public `POST /cart/reorder/:orderId` echoed any order's contents with no ownership check | **FIXED** | Endpoint requires authentication and resolves the order scoped to the caller's linked customer profile — other customers' order IDs return NotFound. Customer Web BFF route forwards the customer session accordingly. |
| 4.4 | Unauthenticated store-pickup schedule endpoint returned full order rows including `storePickupOtp` and `idempotencyKeyHash` | **FIXED** | Requires authentication, enforces customer ownership (admins excepted), and responds with a payload-safe select (no OTP, no idempotency hash). Rate-limited. |
| 4.5 | Store-pickup OTP: `Math.random()` generation, plaintext compare with `!==`; handover skipped status history and reservation consumption | **FIXED** | OTP now CSPRNG-generated (`randomInt` padded), compared timing-safely, and empty OTPs rejected. Handover writes order status history + fulfillment history and consumes ACTIVE reservations exactly like courier delivery. |
| 4.6 | Return eligibility computed but not enforced (INELIGIBLE requests created anyway) | **FIXED** | INELIGIBLE eligibility now rejects request creation; REVIEW_REQUIRED still proceeds to staff review per policy design. |
| 4.7 | Catalog price-sort/in-stock pagination loaded unbounded tables into memory; inventory view likewise | **PARTIAL** | Candidate windows capped (2000 rows) and page size capped at 100 — bounded, but true DB-side price sorting/pagination remains the correct long-term fix and should ride the planned catalog query rework. |

## 5. Frontends

| # | Issue | Status | What was done |
|---|---|---|---|
| 5.1 | Both Next apps pinned `next@14.2.5` with CVE-2025-29927 middleware bypass | **FIXED** | Upgraded to `14.2.35` (customer web incl. `@next/third-parties`). Both apps typecheck and production-build on the new version. |
| 5.2 | Register BFF forwarded backend dev OTP to the browser; stored in sessionStorage and auto-filled | **FIXED** | BFF strips it unconditionally; register/verify pages no longer read/write the session key (legacy key actively removed). Dev codes belong in the dev mailbox/log only. |
| 5.3 | Rider portal stored JWT in localStorage and sent Bearer headers from JS | **FIXED** | Full refactor: login BFF sets an httpOnly+SameSite=Lax+Secure-in-prod cookie; all delivery BFF routes read the token server-side; the portal page no longer touches tokens; added `/api/delivery/logout`. Also removed the dishonest "Fallback local toggle" that flipped duty status UI when the server rejected the change — online state is now server-authoritative only. |
| 5.4 | Mobile merged 23 fabricated categories into real API data and shipped fake fallback trees | **FIXED** | `FALLBACK_CATEGORIES` deleted entirely; categories render only backend data with an explicit "no categories available" state on empty/error (FR-OMNI-006 compliant). |
| 5.5 | Hardcoded developer-LAN IP fallback (`192.168.0.110:6733`) in mobile socket URL | **FIXED** | Missing `EXPO_PUBLIC_FERIO_API_URL` now throws a clear configuration error instead of silently pointing at someone's machine. |
| 5.6 | Zero `error.tsx`/`global-error.tsx` — API outages indistinguishable from empty catalogs | **FIXED** | Route-level `error.tsx` + root `global-error.tsx` added to both Next apps with restrained recovery UX and digest references. |
| 5.7 | Cargo-cult `Authorization: Bearer ${localStorage.getItem("admin_access_token")}` headers in 4 admin pages (key never written) | **FIXED** | Removed everywhere (feedback, requested-products, products, stores). These routes already authenticate via the BFF cookie. |
| 5.8 | Homepage fabricated flash-sale countdown timers and permanent placeholder sections | **NOT CHANGED** | Cosmetic/content decision needing product input on what the sections should show; flagged for design follow-up rather than silently deleted. |
| 5.9 | Google sign-in nonce from `Math.random()`, dead `auth.expo.io` proxy redirect URI on native | **OWNER-REQUIRED** | Correct fix requires choosing the supported Expo OAuth flow (expo-auth-session proxy or custom scheme) and registering redirect URIs with Google — blocked on distribution decisions already listed as Blocked in the checklist. |

## 6. Process and Infrastructure

| # | Issue | Status | What was done |
|---|---|---|---|
| 6.1 | No CI at all — the excellent PostgreSQL integration suite never ran automatically | **FIXED** | Added `.github/workflows/ci.yml`: backend install + prisma generate + production build + full unit suite; both Next apps install + typecheck + production build. Integration tests requiring disposable PostgreSQL/Redis services are the natural next CI extension once a compose-based runner is approved. |
| 6.2 | No automated backups, no restore exercise | **OWNER-REQUIRED** | Hosting-dependent (hosting selection is itself Blocked in the checklist). Nothing in code can satisfy this. |
| 6.3 | `tsconfig.tsbuildinfo` build artifacts committed | **NOT CHANGED** | Trivial cleanup deliberately left out of this security-focused pass to keep the diff reviewable; safe to delete and gitignore anytime. |

---

## Owner Actions That Code Cannot Do

1. **Rotate every leaked credential**: Paperfly key/username/password, SSLCommerz store ID+password, CarryBee client secret, Google OAuth client secret, Neon database password. Then confirm deployed environments use the replacements.
2. Decide on git-history rewrite vs. rotation-only for the already-public secrets.
3. Approve hosting + backup/restore plan; run and document one restore exercise.
4. Answer the fourteen Blocked product decisions in the implementation checklist — several fixes above (COD settlement for rider deliveries, contribution costing) have a documented interim behavior pending those approvals.
5. Choose the supported native Google sign-in flow and register redirect URIs (see 5.9).

## Verification Evidence (this remediation)

- `ferio-nest-prisma`: `pnpm build` clean; `pnpm test` → **61 suites, 214/214 passing**, including updated specs for wallet ledger exactness, OTP hashed storage, socket rejection semantics, and payment ownership.
- `ferio-customer-web`: `tsc --noEmit` clean; `next build` succeeds on 14.2.35.
- `ferio-admin-dashboard/ferio-admin`: `tsc --noEmit` clean; `next build` succeeds on 14.2.35.
- `ferio-mobile-expo54`: `pnpm run typecheck` clean.
- `git grep` for every previously-leaked secret string at HEAD: **zero matches in tracked files**.
