# Ferio Project Progress 19

**Checkpoint date:** August 11, 2026  
**Milestone:** Release 1 — RTO receipt, cost, and stock disposition  
**Status:** Courier return completion creates a separate RTO case whose inventory remains reserved until audited physical receipt

## Delivered

### Separate RTO model

- Added dedicated RTO cases and items linked to shipment, order, order item, and original inventory reservation rather than using customer return records.
- Added awaiting-receipt and inspected states, normalized operational reasons, courier raw reason, timestamps, and inspector actor.
- Added outbound courier, return courier, other, and bounded total cost fields.
- Added an unapplied migration with RTO enums, tables, indexes, uniqueness constraints, and restricted relations.

### Courier and inventory behavior

- Normalized Pathao's returned event to terminal `RTO` and permitted explicit failed-delivery-to-RTO transitions.
- Automatically creates one audited RTO case from an accepted terminal courier event.
- Removed automatic reservation release from courier callbacks so unreceived parcels cannot become sellable stock.
- Required staff to reconcile every expected unit as received or lost, and every received unit as sellable or damaged.
- Released reservations only after physical receipt; sellable units become available, damaged units increase damaged stock, and lost units reduce on-hand stock.
- Added traceable release, damage, and correction movements linked to the RTO case and actor.
- Cancelled the commercial order and fulfillment with timestamp, reason, and histories only after physical RTO receipt.

### Admin Web and reporting

- Added protected RTO list and inspection BFF routes.
- Added an RTO receipt queue to Shipping with item counts, reason, cost, validation, history, and retry-safe terminal behavior.
- Added recorded RTO cost to operational finance reporting without presenting it as contribution or profit.
- Continued to label contribution incomplete because approved cost allocation rules and other required inputs remain absent.

## Validation

| Project | Check | Result |
| --- | --- | --- |
| Backend | Prisma schema build and validation | Passed; 35 schema fragments |
| Backend | Focused RTO, shipping, and report tests | Passed; 3 suites and 7 tests |
| Backend | Full unit tests | Passed; 15 suites and 52 tests |
| Backend | Production build | Passed |
| Admin Web | Production build | Passed; 34 pages/routes generated |

## Still Open

- New and earlier migrations remain unapplied to disposable or live PostgreSQL.
- RTO callback behavior has unit coverage but not real Pathao or Steadfast sandbox verification.
- Existing records normalized as legacy `RETURNED` require migration/backfill policy before production rollout.
- COD collection, courier settlement, settlement items, provider fee variance, and reconciliation jobs remain absent.
- Quarantine/location custody and partial-delivery handling remain outside this RTO disposition model.
- Database integration, webhook concurrency, browser, and end-to-end RTO tests remain.

## Recommended Next Work

1. Add COD collection and courier settlement ledgers linked to shipments and provider references.
2. Record settlement items, courier fees, deductions, variances, and settlement result actors.
3. Add reconciliation checks for delivered COD without collection, RTO with collection, and unmatched settlement items.
4. Apply the migration chain to disposable PostgreSQL and test concurrent duplicate courier callbacks.
