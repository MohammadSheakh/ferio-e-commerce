# API Verification Status

**Date of verification:** September 11, 2026
**Method:** Every endpoint table in this folder was derived from the NestJS
controller tree (`src/features/**/*.controller.ts`, 245 routes) and
cross-checked against the actual frontend call sites in
`ferio-customer-web`, `ferio-admin-dashboard/ferio-admin` and
`ferio-platform-admin`. Sample payloads were taken from live DTOs.

## Files & status

| File | Screens covered | Status |
|---|---|---|
| README.md | Conventions, envelope, auth realms, error codes | ✅ |
| customer-storefront/discovery-and-product.md | Home, listing/search/filters, product detail, social proof | ✅ verified |
| customer-storefront/cart.md | Add/edit/remove, validate, save/share/reorder/merge | ✅ verified |
| customer-storefront/checkout-and-payment.md | Delivery/payment options, preview, COD place (idempotent), prepaid initiate/retry, wallet order, public tracking | ✅ verified |
| customer-storefront/auth-and-account.md | Register/login/OAuth/refresh, profile link, addresses, history/reorder, notifications, wallet | ✅ verified |
| customer-storefront/value-added-services.md | Services booking, warranty, product requests, reviews submission, outlets, chat ticket | ✅ verified |
| customer-storefront/rider-portal.md | Apply, portal home, assigned orders, delivery lifecycle | ✅ verified |
| tenant-admin/dashboard-overview.md | Reports overview + queue-health tiles + plan usage | ✅ verified |
| tenant-admin/catalog-and-inventory.md | Products CRUD/status, categories, brands, inventory adjust, hero settings | ✅ verified |
| tenant-admin/orders-and-fulfillment.md | Queue/filters/detail, COD confirm/cancel, fulfillment pipeline + exceptions, store pickup OTP | ✅ verified |
| tenant-admin/shipping-and-couriers.md | Providers, shipments create/list, webhooks evidence+retry, polls+backlog, router scorecard | ✅ verified |
| tenant-admin/customers.md | Search/detail scoped to tenant | ✅ verified |
| tenant-admin/payments-wallet-reviews-content.md | Attempts+recovery, wallet review desk, review/banner moderation, messaging ops, outlets | ✅ verified |
| tenant-admin/returns-rto-refunds.md | Eligibility→case→review→inspect→refund; RTO inspect | ✅ verified |
| tenant-admin/settlements-reconciliation.md | CSV template/preflight/import/history; findings/scan/action/retry | ✅ verified |
| tenant-admin/reports-exports.md | Overview (bounded aggregation) + orders-export cap | ✅ verified |
| tenant-admin/chat-support.md | Socket ticket, conversations/messages REST | ✅ verified |
| tenant-admin/staff-settings-security.md | Staff lifecycle + seats gate, settings CRUD, 2FA, audit logs | ✅ verified |
| platform-admin/organizations-lifecycle.md | Dashboard, orgs CRUD/provision/status/timeline, closure, per-org usage+reconcile | ✅ verified |
| platform-admin/plans-billing-subscriptions.md | Plans, trial, subscriptions directory, invoices/attempts/callback/configured | ✅ verified |
| platform-admin/usage-fleet-migrations.md | Migrations start/status/pause/resume, database-health drift view, retention sweep | ✅ verified |
| platform-admin/support-access.md | List/request(5min–8h)/revoke | ✅ verified |

## September 11 integration correction

The customer storefront tenancy status client now unwraps the backend success
envelope for `GET /tenancy/status` before reading `code` and `storeName`.
NestJS applies the global response contract `{ success, data, message }`, so a
top-level `ACTIVE` read was incorrect and could render a healthy tenant as
unavailable. The client retains a compatibility path for older unwrapped
staging responses while treating malformed payloads as
`TENANT_UNAVAILABLE`.

The platform-admin catch-all BFF also now forwards `PUT` and `DELETE` in
addition to `GET`, `POST`, and `PATCH`, matching the platform OpenAPI surface
for entitlement overrides and feature-flag operations. This closes a proxy
method gap; it does not claim that every platform screen has browser E2E proof.

The tenant-admin store setup checklist also now calls the implemented
`/api/delivery-zones` BFF route instead of the nonexistent
`/api/admin/delivery-zones` path. A static audit of the tenant-admin browser
call sites and 104 Next.js API route files found no additional verified route
or method mismatch in this shot. Catch-all BFF routes were included in the
review. This is source-level integration evidence, not live browser or
production-host proof.

The tenant-admin generated `lib/api-schema.ts` was also regenerated from the
backend OpenAPI artifact after `api:check` detected drift. The refresh adds
the newer entitlement, payment-recovery, storage-finalize, and messaging
provider operations plus the documented provider-config DELETE methods.

The customer storefront source audit also mapped 102 browser/shared-library
files to 51 Next.js BFF routes, including dynamic and catch-all routes, with
no unresolved path or method mismatch in the shot. Its generated
`lib/api-schema.ts` was regenerated after `api:check` detected the backend
storage-finalize endpoint and `FinalizePutDto` were missing. This remains
source-level evidence; live browser, tenant-host isolation, SSR/BFF, socket,
provider, and production validation are still required.

The customer authentication and chat BFF review also found no source-level
route or method mismatch: verification establishes a session, refresh/logout
rotate and clear the httpOnly session cookies, and authenticated/guest chat
ticket plus message-history calls match the documented backend controllers.
This is not browser cookie, live host-forwarding, WebSocket room-isolation,
or production identity-provider proof.

The customer cart/checkout review corrected two documentation contracts:
`/cart/validate` is POST, and `/payments/initiate` is POST with the order
identity, phone proof, and provider in the body. The customer BFF performs
payment initiation after prepaid order placement. Source-level route coverage
was clean; duplicate-submit, payment callback, stock/price race, live-host,
and provider-credential behavior still require runtime evidence.

The account/value-added API review also fixed a shared transport edge case:
customer-session BFF calls now normalize `HeadersInit` before adding the
server-owned Authorization and tenant-forwarding headers, preserving wallet
top-up idempotency and correlation headers. Account profile and address docs
were corrected to match the backend PUT contracts. This remains source-level
evidence; replay, upload/malware, provider, cookie, and live-isolation tests
are still required.

## Known documentation gaps (honest)

- Response bodies for endpoints whose controllers return inline literals are
  described by purpose; full JSON schemas land as the @ApiOkResponse
  enrichment pass completes (openapi.json already carries 98 DTO components
  and is CI-enforced).
- WebSocket event names for chat are documented at the transport level only;
  a dedicated events reference rides with the socket gateway code.
