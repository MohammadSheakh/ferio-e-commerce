# Storefront — Checkout, COD & Prepaid

**Frontend:** `app/checkout/page.tsx`, `lib/checkout.ts`, `app/payment/*`
**Verified against:** `checkout.controller.ts` (`@Controller('checkout')`),
`order.controller.ts` (`POST /orders`, `POST /orders/wallet`, `POST /orders/track`),
`commerce-payments` controller (`/payments/*`)

---

## Screen 1: Delivery options + Payment methods
| # | Method | Endpoint | Purpose |
|---|---|---|---|
| 1 | GET | `/checkout/delivery-options` | Active zones/fees for the entered district |
| 2 | GET | `/checkout/payment-options` | COD / SSLCommerz / aamarPay / Wallet availability per settings |

## Screen 2: Preview (breakdown before placing)
```http
POST /checkout/preview
{
  "name": "…", "phone": "01712345678",
  "district": "Dhaka", "area": "Gulshan",
  "detailedAddress": "House 1, Road 1", "landmark": null,
  "deliveryMethod": "HOME_DELIVERY",
  "paymentMethod": "COD",
  "couponCode": "SAVE100",           // optional
  "termsAccepted": true,
  "marketingConsent": false,           // separate from terms (FR-CHK-006/007)
  "purchaseActivityConsent": false,    // optional account activity preference
  "customerNote": "Leave at reception" // optional
}
```
For store pickup, send `deliveryMethod: "STORE_PICKUP"`, `pickupStoreId`, and
optionally `preferredPickupDate` and `preferredPickupSlot`. The cart is not
selected by a client-supplied JSON token: the customer BFF forwards its
httpOnly `ferio_cart` cookie as the `X-Cart-Token` request header.

Response recalculates subtotal/discount/deliveryFee/total and snapshots a
draft with `expiresAt`. Coupon/delivery changes after preview cause a
stable conflict on placement.

## Screen 3: Place COD order (idempotent)
```http
POST /checkout/orders
Idempotency-Key: <client-generated unique>
{ "paymentMethod": "COD" }
```
- The BFF forwards the httpOnly `ferio_cart` cookie as `X-Cart-Token`; do not
  accept or persist a cart token from browser JSON.
- Server revalidates price/stock/coupon/zone inside a serializable transaction.
- Result: `PENDING_CONFIRMATION` (policy ALWAYS) or `CONFIRMED`.
- Confirmation message is queued **after commit**; failures never fail the order.

## Screen 4: Prepaid (SSLCommerz/aamarPay)
| # | Method | Endpoint | Purpose |
|---|---|---|---|
| 1 | POST | `/checkout/orders` `{ paymentMethod: "PREPAID" }` | Creates order + payment attempt; returns redirect payload |
| 2 | POST | `/payments/initiate` `{ orderId, reference, phone, provider }` | Builds provider session after order placement (server signs tenant callback token) |
| 3 | POST | `/payments/retry` `{ reference, phone, provider }` | Fresh attempt after customer proof; never duplicates the order |
Provider callback is verified server-side (val_id) and idempotent — success
flips only that attempt and confirms its order once.

## Screen 5: Wallet checkout
| # | Method | Endpoint | Purpose |
|---|---|---|---|
| 1 | POST | `/checkout/orders/wallet` | Atomic: balance check → single debit → stock reservation → order |

Insufficient balance creates **no order and no partial debit**.
The authenticated customer BFF forwards the httpOnly `ferio_cart` cookie as
`X-Cart-Token` and the optional `Idempotency-Key` header.

## Screen 6: Public tracking
| # | Method | Endpoint | Purpose |
|---|---|---|---|
| 1 | POST | `/orders/track` `{ reference, phone }` | Status timeline without account login; phone is required and verified against the order address |

The tracking response preserves the order payment method (`COD`, `PREPAID`,
or `PAY_AT_STORE`). No signed-token tracking contract is currently exposed.
