# Checkout Module

## Scope

Delivery/payment option reads, checkout preview, delivery-zone administration,
pricing, coupons, and checkout draft/revalidation behavior.

## Architecture Score

**84%**. Checkout has a good tenant client boundary, typed input, pricing
revalidation, and a clear separation from order placement. External pricing
and inventory failure tests remain important.

## Routes

| Route | Score | Review |
|---|---:|---|
| `GET /checkout/delivery-options` | 84% | Good read surface; cache and provider timeout policy should be explicit. |
| `GET /checkout/payment-options` | 84% | Keep provider readiness separate from payment authorization. |
| `POST /checkout/preview` | 86% | Strong validation/repricing boundary; test coupon and inventory races. |
| `GET /admin/delivery-zones` | 82% | Protected admin read with bounded query expectations. |
| `POST /admin/delivery-zones` | 82% | Require tenant write gate and uniqueness constraints. |
| `PATCH /admin/delivery-zones/:id` | 82% | Audit and concurrent pricing changes need tests. |

## Tasks

1. Add latency/failure tests for courier and payment-option integrations.
2. Verify all zone mutations call suspension protection and audit atomically.
3. Add cache stampede and high-cart-size tests.
