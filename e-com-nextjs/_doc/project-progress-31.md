# Ferio Project Progress 31

**Checkpoint date:** August 11, 2026  
**Milestone:** Release 1 — Provider settlement report import safety  
**Status:** Normalized Pathao and Steadfast settlement reports now retain immutable source evidence, apply only when every row is eligible, and converge safely under duplicate or overlapping imports

## Delivered

### Immutable import evidence

- Added report and row persistence with provider report references, idempotency hashes, canonical source hashes, normalized row hashes, raw payload snapshots, actor identity, and audit evidence.
- Supports normalized `API`, `CSV`, and `MANUAL_JSON` source contracts without pretending provider-native file parsing or remote retrieval is complete.
- Enforces provider-scoped report uniqueness and global provider-row deduplication.
- Exposes authenticated Admin list and import endpoints under `/admin/settlements/imports`.

### All-or-quarantine reconciliation

- Resolves provider tracking numbers only against shipments belonging to the selected courier.
- Classifies rows as applied, unmatched, ineligible, already settled, or duplicate.
- Applies a report through the proven courier settlement transaction only when every row is eligible.
- Quarantines mixed reports as `NEEDS_REVIEW` without partially changing COD collections, orders, or settlement ledgers.
- Preserves matched shipment and collection evidence for operator investigation.

### Concurrency proof

- Races exact report replay and proves one import, row, settlement item, and import audit record.
- Reuses a provider row under a different report and proves it is quarantined as a duplicate.
- Proves a report containing one valid and one missing tracking number creates no partial settlement.
- Races different reports for the same shipment and proves one applies while the other converges to an already-settled review record.

## Validation

| Project | Check | Result |
| --- | --- | --- |
| Backend | Prisma schema and client generation | Passed |
| Backend | Full migration deploy to disposable PostgreSQL | Passed; 18 of 18 migrations |
| Backend | Focused settlement/import PostgreSQL suite | Passed; 1 suite and 5 tests |
| Backend | All PostgreSQL integration suites | Passed; 3 suites and 17 tests |
| Backend | Full unit tests | Passed; 19 suites and 69 tests |
| Backend | Production build including shared libraries | Passed |
| Infrastructure | Disposable database cleanup | Passed; test database removed and absence verified |

## Still Open

- Admin import submission, import history, and row exception review UI remain pending.
- Provider-native CSV parsing and Pathao/Steadfast report API retrieval remain pending.
- Provider sandbox delivery callbacks remain pending.
- Settlement exception resolution and corrected-report supersession remain pending.
- Combined Customer Web, Admin Web, API, PostgreSQL, and Redis end-to-end execution remains pending.

## Recommended Next Work

1. Add typed Admin API proxies for listing and submitting normalized settlement imports.
2. Extend the reconciliation screen with a design-language-aligned report form and immutable import history.
3. Show row-level exception reasons without allowing operators to mutate source evidence.
4. Add corrected-report guidance before implementing provider-native parsers or remote retrieval adapters.
