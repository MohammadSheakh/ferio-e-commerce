# Ferio Project Progress 14

**Checkpoint date:** August 11, 2026  
**Milestone:** Release 1 — Reports and operational controls  
**Status:** Truthful order-cohort outcome reporting is implemented; incomplete financial ledgers remain visibly unavailable

## Delivered

### Backend reports

- Added an authenticated admin reporting module with a UTC order-created cohort basis and a default rolling 30-day window.
- Added validated date, source, and courier filters with a maximum 366-day operational query range.
- Added distinct placed, confirmed, shipped, delivered, cancelled, received-return, broader return-case, and RTO counts.
- Added gross placed, gross confirmed, gross delivered, and known-collected values with an explicit definition for each amount.
- Added payment-state, refund-state, source, courier, pending-confirmation, fulfillment-ready, open-exception, delivery-exception, and RTO summaries.
- Kept all money in integer minor units during aggregation.

### Truthful financial boundaries

- Returned `null` for net-of-refund, refund amount, COD settlement amount, and contribution where supporting ledgers or approved inputs do not exist.
- Added a machine-readable incomplete contribution status and the exact missing input list.
- Avoided using the word “profit” for any incomplete calculation.
- Declared that report dates select `Order.createdAt` in UTC and later outcomes are attributed back to that cohort.

### Admin Web

- Added `/dashboard/reports`, an authenticated BFF route, and sidebar navigation.
- Added restrained outcome, revenue-basis, contribution-status, operations, payment-state, source, and courier sections following the Ferio design language.
- Replaced the Admin overview's mock KPI and recent-order data with live reporting and order APIs.
- Linked the overview to full reports and order operations.

## Validation

| Project | Check | Result |
| --- | --- | --- |
| Backend | Focused report tests | Passed; 2 suites and 5 tests |
| Backend | Full unit tests | Passed; 11 suites and 36 tests |
| Backend | Production build | Passed |
| Admin Web | Production build | Passed; reports BFF/page and live overview generated |

## Still Open

- Migrations from earlier slices have not been applied to a disposable or live PostgreSQL database.
- Refund amounts do not have a dedicated order-linked ledger.
- COD collection and courier settlement records do not exist, so settlement amount and variance cannot be reported.
- Product cost, acquisition allocation, packaging, subsidy, return/RTO, and messaging cost inputs are incomplete or unapproved.
- Product filtering, permission-aware exports, asynchronous large reports, and masked export tests remain.
- Dedicated permission-specific owner, operations, and finance workspaces remain; the current report combines these views for the existing admin role.
- Outcome dates use an explicitly labeled order-created cohort, not independent event-date accounting views.

## Recommended Next Work

1. Connect Customer Web support and policy pages to the public safe commerce configuration endpoint.
2. Implement return, refund, RTO-cost, COD collection, and settlement records before expanding finance calculations.
3. Add product filters and permission-aware asynchronous exports after explicit staff permissions exist.
4. Apply migrations to disposable PostgreSQL and verify reporting against seeded lifecycle outcomes.
