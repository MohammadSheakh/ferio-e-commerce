# API Verification Status

**Date of verification:** August 26, 2026
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

## Known documentation gaps (honest)

- Response bodies for endpoints whose controllers return inline literals are
  described by purpose; full JSON schemas land as the @ApiOkResponse
  enrichment pass completes (openapi.json already carries 98 DTO components
  and is CI-enforced).
- WebSocket event names for chat are documented at the transport level only;
  a dedicated events reference rides with the socket gateway code.
