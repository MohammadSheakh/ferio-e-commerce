# 5. Commerce Feature Reading Order

Read business flows in dependency order. For each group, start with the
controller, then service, then the focused isolation/idempotency tests.

## Browse and merchandising

```text
catalog -> product-content -> settings -> store-locations
```

Sources: `src/features/catalog/`, `product-content/`, `settings/`, and
`store-locations/`. Verify published visibility, tenant database access,
branding, and inventory/location rules.

## Cart and checkout

```text
customers/customer-account -> cart -> checkout -> order
```

The server revalidates ownership, price, stock, delivery, and coupon data.
Read `cart.tenant-isolation.spec.ts`, `checkout.util.spec.ts`, and the order
reservation tests before trusting a frontend flow.

## Payments and fulfillment

```text
commerce-payments -> shipping -> delivery-personnel -> order
```

Then read `returns`, `refunds`, `rto`, `settlements`, and `reconciliation`.
Pay attention to idempotency, provider webhooks, state transitions, transaction
boundaries, and asynchronous recovery processors.

## Customer value surfaces

```text
wallet -> customer-notifications -> warranty/service-booking
chatting -> product-request -> purchase-activity
```

These are tenant-owned surfaces even when a provider or socket is involved.
Check Redis/object/socket keys for organization namespace and inspect the
tenant-isolation tests.

## Test anchors

```text
test/two-tenant-vertical.integration-spec.ts
test/wallet-isolation.integration-spec.ts
test/order-confirmation.integration-spec.ts
test/shipping-webhook.integration-spec.ts
src/features/{cart,catalog,customers,returns,refunds,reports,wallet}/tests/
```

The PRD journey sections 11.1 through 11.7 are the business narrative; the
checklist MT-7 and MT-13 are the engineering acceptance lens.
