# Ferio Project Progress 42

**Checkpoint date:** August 13, 2026
**Milestone:** Release 1 — Prepaid payment foundation with SSLCommerz and aamarPay
**Status:** Customer Checkout now supports configuration-gated COD or hosted prepaid payment through SSLCommerz and aamarPay, backed by durable attempts, idempotent callback evidence, server-side provider verification, pre-redirect stock reservation, atomic paid-order confirmation, and an Admin payment ledger

## Delivered

### Provider-neutral payment lifecycle

- Adds dedicated commerce payment attempts and callback evidence instead of coupling orders to legacy subscription-payment records.
- Stores merchant transaction, provider/session/validation references, amount, currency, redirect, raw initiation and validation evidence, failure details, timing, and callback outcomes.
- Adds configuration-gated SSLCommerz and aamarPay adapters behind one hosted-payment contract.
- Uses official server-side initiation endpoints and provider validation/query APIs rather than trusting browser redirects or callback fields.

### Order and inventory safety

- Adds COD and prepaid checkout methods with a selected prepaid provider snapshot on the checkout draft.
- Creates prepaid orders as unpaid and pending instead of auto-confirming them through COD policy.
- Reserves stock transactionally before redirecting the customer, with a 30-minute expiry marker, so a provider charge cannot be followed by first-time stock discovery.
- Confirms the order, marks payment paid, and moves fulfillment readiness in one serializable transaction only after merchant transaction, amount, currency, provider status, order state, and SSLCommerz risk checks pass.
- Treats repeated successful callbacks as duplicates without repeating inventory or order effects.

### Customer and Admin Web

- Adds restrained checkout cards for COD, SSLCommerz, and aamarPay, showing prepaid only when credentials exist and the commerce setting is enabled.
- Redirects customers to each provider's hosted payment page; card, mobile-banking, and internet-banking options remain provider-owned.
- Adds a dedicated Admin Payments workspace showing provider readiness, recent attempts, merchant references, amounts, callbacks, failures, and terminal status.
- Allows prepaid activation in settings only after at least one provider has configured credentials.

## Verified Provider Contracts

- SSLCommerz hosted session, IPN, and mandatory order-validation flow: https://developer.sslcommerz.com/doc/v4/index.html
- aamarPay JSON initiation, hosted redirect, POST result fields, and sandbox contract: https://github.com/aamarpay-dev/aamarPay-nodejs

## Validation

| Project | Check | Result |
| --- | --- | --- |
| Backend | Prisma composed-schema validation and client generation | Passed |
| Backend | Provider adapter tests | Passed; SSLCommerz initiation and aamarPay server-query validation covered |
| Backend | Full unit suite | Passed; 26 suites and 89 tests |
| Backend | Production build | Passed |
| Customer Web | Production build | Passed; 21 of 21 pages generated |
| Admin Web | Production build | Passed; 51 of 51 pages generated |
| PostgreSQL | New migration deployment | Not run; no reachable local PostgreSQL service was available in this session |

## Still Open

- Real SSLCommerz and aamarPay sandbox credentials and an internet-reachable HTTPS callback URL are required for end-to-end payment proof.
- Sandbox success, failure, cancellation, IPN replay, risky SSLCommerz payment, amount mismatch, delayed callback, provider outage, and aamarPay query scenarios remain pending.
- Expired prepaid reservations need an automated release/recovery job and customer-facing retry path before launch.
- Provider refunds, settlement retrieval, reconciliation comparison, and audited manual payment correction remain pending.
- Production provider account approval, fees, allowed channels, callback allow-list guidance, and operational ownership remain product-owner decisions.

## Recommended Next Work

1. Add the expired-payment and reservation recovery worker with safe customer retry.
2. Apply the migration and run both providers through real sandboxes using public HTTPS callbacks.
3. Add provider payment reconciliation and refund adapters after sandbox payment completion is proven.
4. Complete Admin payment drill-down, expiry filters, and restricted manual recovery controls.
