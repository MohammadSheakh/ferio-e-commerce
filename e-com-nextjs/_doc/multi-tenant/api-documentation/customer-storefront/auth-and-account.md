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
| 2 | PATCH | `/account/commerce/profile` | Update name/phone/avatar |
| 3 | POST | `/account/commerce/link` `{ reference, phone }` | Link past guest orders via order-reference + phone proof |

## Screen 3: Addresses
| # | Method | Endpoint | Purpose |
|---|---|---|---|
| 1 | POST | `/account/commerce/addresses` | Add address (default handling) |
| 2 | PATCH/DELETE | `/account/commerce/addresses/:id` | Edit/remove; historical orders keep their snapshot |

## Screen 4: Order history / reorder / saved carts
| # | Method | Endpoint | Purpose |
|---|---|---|---|
| 1 | GET | `/orders?page=` (Bearer) | Paginated own history |
| 2 | GET | `/orders/:id` | Detail incl. items/timeline |
| 3 | POST | `/cart/reorder/:orderId` | Reorder ownership-checked |

## Screen 5: Notifications inbox
| # | Method | Endpoint | Purpose |
|---|---|---|---|
| 1 | GET | `/account/notifications?page=&unread=` | Paginated inbox |
| 2 | GET | `/account/notifications/unread-count` | Badge count |
| 3 | POST | `/account/notifications/read-all` | Mark read (dedup keys prevent duplicates) |

## Screen 6: Wallet (customer)
| # | Method | Endpoint | Purpose |
|---|---|---|---|
| 1 | GET | `/account/wallet?page=` | Balance + ledger + top-up status |
| 2 | POST | `/account/wallet/top-ups` `{ provider, amount, customerReference }` + idempotency key | Request recharge → PENDING_REVIEW |
Admin approval credits atomically exactly once (FR-WAL-005).
