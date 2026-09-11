# Checkout API Integration Shot 24

Date: 2026-09-11

## Scope

Compared the customer checkout page and BFF handlers with the NestJS checkout,
order, and commerce-payment controllers/DTOs.

## Findings

- `app/checkout/page.tsx` sends preview fields supported by
  `CheckoutPreviewDto`, including delivery method, pickup store/date/slot,
  payment method/provider, terms, marketing consent, purchase-activity
  consent, and customer note.
- `app/api/checkout/preview/route.ts` and `cartApi()` forward the httpOnly
  `ferio_cart` cookie as `X-Cart-Token`, matching the controller's
  `x-cart-token` header. The previous documentation incorrectly presented a
  client JSON `cartToken`.
- `app/api/checkout/order/route.ts` forwards `Idempotency-Key`, selects the
  authenticated wallet endpoint when needed, and sends the supported
  `PlaceOrderDto` body for COD/PREPAID/PAY_AT_STORE. Prepaid initiation uses
  the exact `{ orderId, reference, phone, provider }` DTO.
- `app/api/payments/retry/route.ts` forwards the exact retry DTO.
- The current public payment-options response exposes `cod`, `prepaid`, and
  `wallet` method flags plus configured provider entries. `PAY_AT_STORE` is
  accepted by checkout DTOs but is not advertised by this response or rendered
  as a current checkout method; it is not documented as available.

## Change

Updated `customer-storefront/checkout-and-payment.md` to remove the invalid
JSON cart token, document the `X-Cart-Token` cookie boundary, include pickup and
consent fields, remove the invalid wallet body token, and document the
idempotency header.

No application or Redis code change was required in this shot.

## Remaining runtime proof

The source contracts now align, but live checkout still requires the local
PostgreSQL/application stack and staging host to be available. Runtime proof
must cover preview/order idempotency, wallet atomicity, prepaid callbacks,
pickup ownership, and cross-tenant host isolation.
