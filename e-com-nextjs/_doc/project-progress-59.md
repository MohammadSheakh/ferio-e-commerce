# Ferio Project Progress 59

**Checkpoint date:** August 20, 2026
**Milestone:** Slice 8A Mobile App contract and session parity
**Status:** Code contracts aligned and builds passing; device/provider E2E remains.

## Delivered

### Authentication and session lifecycle

- Added `provider: "google"` to the Mobile Google OAuth request.
- Added backward-compatible refresh-token response bodies for login, Admin login, email verification, and OAuth while retaining existing HTTP-only cookies for Web clients.
- Added native body-based refresh rotation and logout revocation support to Backend authentication endpoints.
- Installed Expo SecureStore and moved native access/refresh credentials out of AsyncStorage.
- Added rotated refresh-token persistence, one-time 401 refresh/retry, local revocation, and legacy token cleanup.
- Retained AsyncStorage only as the Expo Web fallback and for non-secret user presentation data.

### Server-authoritative checkout

- Added a Mobile server-cart synchronizer that creates a fresh backend cart from current local line items.
- Send `x-cart-token` for checkout preview and order placement.
- Place orders through `POST /checkout/orders` with a cryptographic `Idempotency-Key` header.
- Initiate prepaid payment separately through `POST /payments/initiate` using SSLCommerz or aamarPay.
- Open the returned provider `redirectUrl` and show payment-processing language rather than a false confirmed result.
- Clear the server cart capability only after a durable order is created.

### Services and production data integrity

- Send service bookings through `POST /services/bookings/request` using `customerName`, ISO `preferredAt`, and `customerNote`.
- Removed locally generated booking references and fake success behavior.
- Removed static service, service-detail, hero, and delivery-zone fallbacks.
- Removed seeded product review and Q&A content and stopped failed submissions from appearing as persisted content.
- Repaired the unmatched React Native `View` in `ProductRequestBanner` that previously blocked Mobile type-checking.

## Validation

| Project | Check | Result |
| --- | --- | --- |
| Mobile App | TypeScript `--noEmit` | Passed |
| NestJS Backend | Production build | Passed |
| Backend auth and socket security | Focused Jest suites | Passed, 8/8 |

## Remaining

- Run login, Google OAuth, token-expiry refresh, logout revocation, and upgrade-path tests on Android/iOS devices.
- Run local-cart-to-server-preview-to-COD order E2E against disposable PostgreSQL.
- Run SSLCommerz and aamarPay sandbox redirects and approve a Mobile return/deep-link contract; provider callbacks currently return to the configured Customer Web origin.
- Run service booking and chat E2E from Mobile to Admin.
- Continue the separate CarryBee credential-rotation launch blocker without placing credentials in repository documentation.
