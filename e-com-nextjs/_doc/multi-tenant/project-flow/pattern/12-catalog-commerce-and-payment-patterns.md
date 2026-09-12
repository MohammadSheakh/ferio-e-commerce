# Patterns 81-92: Catalog, Commerce, And Payments

This block is based on the catalog, cart, checkout, order, and payment source
slice. These patterns explain the repeated architecture behind customer
commerce requests.

## 81. Tenant-aware legacy compatibility

Template: catalog tenant-routing tests and `resolveTenantDatabase()` paths.
During migration, a service may support an explicit legacy client, but the
fallback requires a reason and is rejected when tenancy is enabled. This is a
temporary compatibility pattern, not a tenant-isolation design.

## 82. Aggregate stock reservation

Template: `src/features/order/order.service.ts` and
`order-reservation.service.spec.ts`. Read all eligible inventory, calculate
aggregate availability, update reservations and stock movements atomically,
and reject before writes when evidence is insufficient.

## 83. Server-computed checkout preview

Template: `src/features/checkout/checkout.service.ts`. The preview resolves
cart ownership, delivery zones, settings, discounts, payment method, and total
from server data. It is an estimate until the final order transaction.

## 84. Configuration-driven coupon rule

Template: `src/features/checkout/utils/coupon.util.ts` and coupon tests. Parse
and validate configured rules, handle expiry/minimums, bound discounts, and
reject malformed configuration instead of silently accepting unsafe values.

## 85. Cart merge with ownership checks

Template: `src/features/cart/cart.service.ts`. When guest and user carts merge,
the service verifies ownership, revalidates item availability/prices, performs
the merge in a transaction, and marks source carts appropriately.

## 86. Idempotency header contract

Template: `src/features/order/order.controller.ts` and `order.service.ts`.
Require a valid `idempotency-key`, bind it to the tenant/customer operation,
persist the result or conflict, and return the same safe result on replay.

## 87. Explicit order transition guard

Template: `src/features/order/utils/order.util.ts` and order service methods.
Allowed transitions are expressed as domain rules; controllers cannot directly
set arbitrary order or fulfillment states.

## 88. Append-only order timeline

Template: `src/features/order/utils/order-timeline.util.ts`. Build a stable
timeline from status history, fulfillment events, payment attempts, returns,
refunds, and messages. Deduplicate keys and ignore older contradictory events.

## 89. Server-to-server payment validation

Template: `commerce-payments/adapters/payment-adapters.spec.ts`. Do not trust
callback fields alone; validate the transaction with the provider API, map the
provider result to a domain status, and keep credentials inside the adapter.

## 90. Payment recovery processor

Template: `payment-recovery.processor.ts`, queue, and recovery tests. Recovery
claims one attempt atomically, checks current payment/order state, performs a
bounded provider action, and makes duplicate jobs safe no-ops.

## 91. Provider callback deduplication

Template: payment callback models and webhook processors. Persist a provider
event or callback identity before applying a state change. Replayed callbacks
must not duplicate payment, refund, message, or inventory effects.

## 92. Domain event side-effect dispatch

Template: order service plus transactional messaging. Commit the authoritative
tenant state first, then enqueue notifications/analytics/audit side effects
with tenant identity and correlation metadata. External delivery cannot be the
only record of the domain transition.

## Study tests

```text
src/features/catalog/tests/catalog.tenant-routing.spec.ts
src/features/cart/tests/cart.tenant-isolation.spec.ts
src/features/cart/tests/cart.reorder-ownership.spec.ts
src/features/order/tests/order-reservation.service.spec.ts
src/features/order/tests/order-reference.tenant-isolation.spec.ts
src/features/commerce-payments/tests/payment-recovery.spec.ts
src/features/commerce-payments/adapters/payment-adapters.spec.ts
```
