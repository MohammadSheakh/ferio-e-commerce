# Ferio Project Progress 99

**Checkpoint date:** August 21, 2026  
**Milestone:** Retained-screen audit — Admin shipping and RTO  
**Status:** Courier readiness, shipment tracking, authenticated callback recovery, provider polling, and physical RTO inspection now follow the approved design language with corrected table semantics and resilient partial loading.

## Delivered

### Shipment queue correctness

- Corrected the shipment table’s column contract so Customer, Courier, Tracking, COD, Status, and Polling data render under their matching headers.
- Added the protected order identifier to courier poll evidence so every poll links to the correct Admin order detail route.
- Standardized sentence-case shipment and poll statuses, Bangladesh timestamps, scoped column headers, and table busy states.
- Keeps order/customer evidence, tracking identity, COD amount, provider, normalized status, polling eligibility, and provider errors intact.

### Resilient shipping operations

- Changed the six-source shipping load from all-or-nothing failure to independent provider, shipment, callback, callback-queue, poll, and polling-queue updates.
- Successful data remains visible when a separate queue or evidence endpoint is temporarily unavailable.
- Added retryable aggregate failure feedback without hiding successfully loaded operational sections.
- Added per-action pending states and success announcements for provider activation, callback retry, and manual shipment polling.

### Callback and polling evidence

- Flattened callback, shipment, and poll tables to hairline operational grids with semantic status color only.
- Surfaces queue availability, automatic schedule state, recoverable/eligible counts, and waiting/active/failed job counts.
- Preserves authenticated/rejected/processing/processed callback evidence and prevents duplicate action clicks while a mutation is pending.
- Links poll attempts to Admin orders and retains normalized provider outcome or failure evidence.

### RTO inspection

- Added visible labels and focus treatment for return reason, operational reason, quantity disposition, item notes, and courier costs.
- Added retryable RTO loading failure while retaining physical quantity invariants and stock-disposition rules.
- Standardized status/reason copy and avoids duplicate loading rows when existing RTO cases remain visible during refresh.

### Loading behavior

- Added a route-level skeleton matching provider readiness, callback evidence, shipment queue, polling evidence, and RTO operations.
- Limited skeleton animation to users who have not requested reduced motion.

## Validation

| Project | Check | Result |
| --- | --- | --- |
| Backend | Focused shipping and RTO unit suites | Passed; 6 suites and 16 tests |
| Backend | Nest production build | Passed |
| Admin Web | Shipping/RTO legacy-treatment and unsafe-type scan | Passed |
| Admin Web | Next.js production build and type validation | Passed; 93 routes generated |
| Workspace | `git diff --check` | Passed |

## Remaining Boundary

- Real Pathao, Steadfast, REDX, eCourier, Paperfly, and CarryBee provider behavior still depends on approved credentials for whichever couriers are selected for production.
- Sandbox creation, webhook authentication/replay, manual polling, delivery, failure, RTO, and settlement proof remain launch checks for the selected courier.
- Manual keyboard, screen-reader, constrained-network, touch, and narrow-table validation remain Slice 9 checks.
- The broader retained-screen audit continues with remaining Admin and Customer routes ranked by operational impact.
