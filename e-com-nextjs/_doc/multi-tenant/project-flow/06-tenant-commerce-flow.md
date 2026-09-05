# 6. Tenant Commerce Flow

This document connects the storefront customer journey to the admin operation
journey. All paths below begin after tenant resolution.

## Catalog And Storefront Read

```text
GET /api/v1/catalog/*
  -> CatalogController
  -> CatalogService
  -> tenant Prisma read
  -> published products/categories/variants
```

Catalog reads project only the fields needed by the storefront. Admin catalog
routes use admin guards and can create/update categories, products, variants,
inventory, and publication state.

Product content, storefront analytics, store locations, settings, services,
warranty, and customer modules follow the same controller -> service -> tenant
database pattern, with their own policy and audit rules.

## Cart

1. A guest receives or sends an `x-cart-token`.
2. `CartService` loads the tenant cart using that token.
3. Add/update/remove operations validate product publication, variant state,
   current price, and stock.
4. A logged-in customer can merge the guest cart into the account cart.
5. Saved/shared/reorder endpoints apply owner or share-token rules.

The cart is not trusted checkout truth. Checkout and order placement revalidate
all mutable commerce facts.

## Checkout Preview

```text
POST /api/v1/checkout/preview
  -> CheckoutPreviewDto
  -> CheckoutService.preview()
  -> load tenant cart/items
  -> re-read product/variant/stock/price
  -> calculate delivery fee and discount
  -> validate payment/COD policy
  -> persist a server-priced checkout draft
  -> return totals and available options
```

The client may display totals, but it cannot set the authoritative price. Admin
delivery-zone and pricing mutations are guarded and audited.

## Order Placement

```text
POST /api/v1/checkout/orders
  -> PlaceOrderDto + cart token + optional idempotency key
  -> OrderService.placeOrder()
  -> tenant transaction
       re-read draft/cart and mutable prices
       enforce stock and COD rules
       create order/items/address/status history
       reserve or decrement inventory
       write deduplicated transactional-message record
       write audit/history where required
  -> return order reference/status
```

An idempotency key prevents browser retries from creating duplicate orders.
Payment initiation is a separate step for prepaid orders. Network calls are not
held inside the order transaction.

## Payment Choice

### COD

The order is created with COD state and may require verification. Admins later
confirm, cancel, fulfill, or resolve exceptions through guarded order routes.

### Prepaid

1. The payment service creates an attempt with a unique merchant transaction.
2. It selects a configured provider through `PaymentGatewayRegistry`.
3. The provider adapter returns a hosted redirect/session.
4. The client completes the provider flow.
5. The provider calls the tenant-bound callback.
6. The service verifies authenticity, amount, currency, and replay state.
7. A transaction updates the attempt/order state and records the callback.

See `07-async-workers-and-integrations.md` for retries and reconciliation.

## Admin Fulfillment

Tenant Admin routes under `/api/v1/admin/orders` perform controlled state
transitions:

```text
PLACED -> CONFIRMED -> PROCESSING -> SHIPPED -> DELIVERED
                    \-> CANCELLED
SHIPPED -> RETURN_REQUESTED / RETURNED / RTO
```

The exact allowed transitions are enforced by the order service, not by the
frontend. Inventory, fulfillment history, pickup handover, COD verification,
notifications, and audit records are coordinated around those transitions.

## Shipping And Delivery

`ShippingService` selects a courier adapter through `CourierRouterService`.
Webhook and polling work are asynchronous. The service stores normalized
shipment state and provider events in the tenant database. Courier credentials
and provider readiness are never exposed in public responses.

## Returns, Refunds, RTO, And Settlements

- `returns`: customer/admin return lifecycle and inspection evidence;
- `refunds`: refund request/result state and payment coordination;
- `rto`: return-to-origin inspection and resolution;
- `settlements`: courier settlement import/parsing and reconciliation;
- `reconciliation`: findings, scans, acknowledgements, and operational alerts;
- `reports`: bounded operational/financial reads and aggregations.

These modules use tenant transactions and audit trails for financial or stateful
mutations. Large imports, scans, polling, and reports should be queued or
bounded rather than run as unbounded synchronous HTTP work.

