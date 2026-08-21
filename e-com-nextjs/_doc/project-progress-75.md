# Ferio Project Progress 75

**Checkpoint date:** August 21, 2026  
**Milestone:** Deterministic Release 1 coupons  
**Status:** Server-owned coupon validation and canonical checkout calculation are complete.

## Delivered

### Coupon rules

- Added configuration-driven Release 1 coupon rules through `CHECKOUT_COUPONS_JSON`.
- Supports normalized case-insensitive codes, fixed-poisha discounts, integer percentage discounts, minimum subtotal, maximum discount, active/inactive state, and start/end timestamps.
- Rejects unknown, inactive, not-yet-active, expired, below-minimum, and invalidly configured coupons with explicit errors.
- Caps every discount at the cart subtotal so a coupon cannot create a negative merchandise total.

### Canonical pricing

- Added optional coupon input to the checkout preview contract and Customer Web checkout form.
- Calculates discounts only in the Backend; Customer Web displays the returned code and amount without calculating either.
- Snapshots the normalized coupon code and discount total into the checkout draft and final order.
- Re-evaluates the current server rule during order placement and requires a fresh preview if the discount changed.
- Existing subtotal and delivery-price consistency checks remain in the same transaction boundary.

### Data changes

- Added `couponCode` snapshots to `CheckoutDraft` and `Order`.
- Added migration `20260821190000_checkout_coupon_snapshot`.
- Documented an empty safe default in `.env.example`; coupons remain disabled until rules are configured.

## Validation

| Project | Check | Result |
| --- | --- | --- |
| Backend | Coupon normalization, fixed, percentage, cap, minimum, expiry, invalid-code, blank-code, and subtotal-floor tests | Passed; 4 tests |
| Backend | Prisma client generation | Passed |
| Backend | Complete NestJS application and library build | Passed |
| Customer Web | Next.js production build and type validation | Passed; 60 routes generated |
| Workspace | `git diff --check` | Passed |

## Configuration Example

```json
[
  {
    "code": "WELCOME10",
    "type": "PERCENT",
    "value": 10,
    "minimumSubtotal": 100000,
    "maximumDiscount": 25000,
    "startsAt": "2026-08-21T00:00:00Z",
    "endsAt": "2026-09-30T23:59:59Z",
    "active": true
  }
]
```

All monetary values use poisha. Usage limits, customer segmentation, and campaign attribution remain Release 2 campaign concerns rather than Release 1 checkout logic.
