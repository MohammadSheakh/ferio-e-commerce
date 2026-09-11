# Storefront — Auth & Account

**Frontend:** `app/account/*`, `lib/customer-session.ts`
**Verified against:** `auth.controller.ts`, `customer-account.controller.ts`,
`customers.service`, notifications/wallet controllers

---

## Screen 1: Register / Login / Verify
| # | Method | Endpoint | Purpose |
|---|---|---|---|
| 1 | POST | `/auth/register` `{ name,email,password,phone }` | Create account (+OTP flow) |
| 2 | POST | `/auth/login` `{ email,password }` | Access+refresh tokens; rate-limited |
| 3 | POST | `/auth/verify-email` | OTP verify |
| 4 | POST | `/auth/resend-verification` | Resend OTP |
| 5 | POST | `/auth/oauth` | Google sign-in exchange |
| 6 | POST | `/auth/refresh` | Rotate access token via httpOnly refresh cookie |

## Screen 2: Profile & linking to customer profile
| # | Method | Endpoint | Purpose |
|---|---|---|---|
| 1 | GET | `/account/commerce` | Profile + addresses + recent orders summary |
| 2 | PUT | `/account/commerce/profile` | Update name/phone/avatar |
| 3 | POST | `/account/commerce/link` `{ reference, phone }` | Link past guest orders via order-reference + phone proof |

## Screen 3: Addresses
| # | Method | Endpoint | Purpose |
|---|---|---|---|
| 1 | POST | `/account/commerce/addresses` | Add address (default handling) |
| 2 | PUT/DELETE | `/account/commerce/addresses/:id` | Edit/remove; historical orders keep their snapshot |

## Screen 4: Order history / reorder / saved carts
| # | Method | Endpoint | Purpose |
|---|---|---|---|
| 1 | GET | `/account/commerce` | Authenticated profile plus the customer's recent order projection |
| 2 | POST | `/account/commerce/link` `{ reference, phone }` | Link an eligible guest order before it appears in the account projection |
| 3 | POST | `/cart/reorder/:orderId` | Reorder ownership-checked; optional `orderItemIds` selects items |

The shipped customer UI does not call generic `/orders?page=` or `/orders/:id`
customer endpoints. Order detail, timeline, and fulfillment state are exposed by
the account commerce projection and the dedicated reorder/store-pickup actions;
the public `/orders/*` controller is reserved for tracking and store-pickup
flows documented in `checkout-and-payment.md`.

## Screen 5: Notifications inbox
| # | Method | Endpoint | Purpose |
|---|---|---|---|
| 1 | GET | `/account/notifications?page=&limit=&unreadOnly=true` | Paginated inbox; `unreadOnly` is the supported filter |
| 2 | GET | `/account/notifications/unread-count` | Badge count |
| 3 | PATCH | `/account/notifications/:id/read` | Mark one notification read |
| 4 | POST | `/account/notifications/read-all` | Mark all notifications read |
| 5 | DELETE | `/account/notifications/:id` | Delete one notification |

## Screen 6: Wallet (customer)
| # | Method | Endpoint | Purpose |
|---|---|---|---|
| 1 | GET | `/account/wallet?page=&limit=` | Balance + ledger + top-up status |
| 2 | POST | `/account/wallet/top-ups` `{ provider, amount, customerReference, customerNote? }` + `Idempotency-Key` header | Request recharge → PENDING_REVIEW; amount is minor units |
Admin approval credits atomically exactly once (FR-WAL-005).
