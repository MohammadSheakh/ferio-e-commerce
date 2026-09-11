# Customer Value-Added API Integration Shot 14

Date: 2026-09-11

## Scope

Audited customer service booking, product-request submission, product-content
loading, and authenticated YouTube review submission against the NestJS
controllers and DTOs. Audited the related tenant-admin service, requested-
product, review moderation, and banner calls where the same contracts are
shared.

## Findings

- Customer services listing/detail use `GET /services` and `GET /services/:slug`.
- Customer booking BFF forwards `POST /services/bookings/request` with the
  backend DTO fields and preserves tenant forwarding headers.
- Customer product requests use `POST /product-requests`; authentication is
  optional and the backend can associate the request with the authenticated
  user.
- Customer product-content loading uses `GET /product-content/:slug` and
  review submission uses the authenticated
  `POST /product-content/:productId/reviews` route.
- Tenant-admin service CRUD/booking status calls match the guarded
  `/admin/services` controller.
- Tenant-admin review moderation matches the BFF and controller, but the
  previous documentation incorrectly advertised a `status` query filter.
- Tenant-admin banner update/delete are mounted at
  `/admin/product-content/banners/:id`, not nested below the product route.
- Tenant-admin requested-product operations are mounted at
  `/product-requests...` with admin guards, not `/admin/requested-products...`.

## Changes

- Corrected `customer-storefront/value-added-services.md` request/review
  payloads and authentication notes.
- Corrected `tenant-admin/payments-wallet-reviews-content.md` review queue,
  banner, and requested-product paths/methods.

## Boundary notes

This is source-level contract evidence. It does not claim browser E2E,
customer authentication, tenant-host isolation, moderation authorization,
provider behavior, or production operational acceptance.
