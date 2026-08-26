# Platform Admin — Plans, Subscriptions & SaaS Billing

**Frontend:** `app/plans`, `app/subscriptions`, `app/billing`
**Verified against:** plans/subscriptions controllers,
`platform-billing.controller.ts`, billing list endpoints

---

## Plans
| # | Method | Endpoint | Purpose |
|---|---|---|---|
| 1 | GET | `/platform/plans` | Catalog incl. entitlements matrix |
| 2 | POST | `/platform/plans` `{ key, displayName, pricing:{interval,amountMinor}, entitlements:[{featureKey,enabled,limit}] }` | Create/version plan (prices stay configurable per owner #11) |

## Subscriptions
| # | Method | Endpoint | Purpose |
|---|---|---|---|
| 1 | GET | `/platform/subscriptions` | Directory: org × plan × status × renewal |
| 2 | POST | `/platform/organizations/:id/subscription/trial` | Start 14-day trial (PO-002) |
| 3 | (service) | changePlan / cancel / reactivate | State machine transitions with event history |

## Billing (SSLCOMMERZ adapter; sandbox until merchant exists)
| # | Method | Endpoint | Purpose |
|---|---|---|---|
| 1 | GET | `/platform/billing/invoices` | Invoices with PAID/OPEN outcome |
| 2 | GET | `/platform/billing/payment-attempts` | Provider attempts (INITIATED/SUCCEEDED/FAILED) |
| 3 | POST | `/platform/billing/invoices` · `/platform/billing/invoices/:id/pay` | Create invoice + start adapter session (sandbox/mock until merchant exists) |
| 4 | GET/POST | `/platform/billing/callback` | Verified idempotent webhook; single INITIATED→SUCCEEDED transition per attempt |
| 5 | GET | `/platform/billing/configured` | Whether provider credentials are present (never leaks them) |

SaaS money NEVER touches tenant Payment/Wallet/COD/refund/settlement tables —
separate schemas and services by construction.
