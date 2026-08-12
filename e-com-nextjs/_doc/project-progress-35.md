# Ferio Project Progress 35

**Checkpoint date:** August 11, 2026  
**Milestone:** Release 1 — Evidence-bound settlement CSV imports  
**Status:** CSV settlement imports now apply only when the submitted file and normalized rows exactly match server-recomputed preflight evidence, with bounded immutable metadata retained on the import

## Delivered

### Bound parser evidence

- Added optional source file name, source file checksum, parser version, and normalized-row checksum fields to immutable settlement imports.
- Added a provider/checksum index for operational lookup without storing the full source file body.
- Returns parser version and normalized-row checksum from canonical preflight.
- Keeps API and manual normalized imports valid without falsely assigning CSV evidence.

### Server-side drift rejection

- Requires successful CSV evidence for every import whose source is `CSV`.
- Re-runs canonical parser v1 during import using the submitted file content.
- Verifies the exact SHA-256 file checksum supplied by preflight.
- Recomputes normalized rows from the import command and compares their checksum with parser output.
- Rejects changed file content or edited rows before shipment matching, settlement creation, audit creation, or collection updates.
- Removes full CSV content from persisted import JSON while retaining bounded filename and checksum evidence.

### Admin evidence binding

- Keeps the validated file content in browser memory only until import submission.
- Blocks CSV submission until the current file has a successful preview.
- Makes bound CSV rows read-only and disables adding or removing rows after successful preview.
- Shows source file, parser version, and shortened checksum in immutable import history.
- Requires re-preview whenever provider, source, or file selection changes.

## Validation

| Project | Check | Result |
| --- | --- | --- |
| Backend | Prisma schema and client generation | Passed |
| Backend | Full migration deploy to disposable PostgreSQL | Passed; 20 of 20 migrations |
| Backend | Focused settlement/import/evidence PostgreSQL suite | Passed; 1 suite and 9 tests |
| Backend | All PostgreSQL integration suites | Passed; 3 suites and 21 tests |
| Backend | Full unit tests | Passed; 20 suites and 74 tests |
| Backend | Production build including shared libraries | Passed |
| Admin Web | TypeScript and production build | Passed |
| Admin Web | Static route and page generation | Passed; 42 of 42 |
| Infrastructure | Disposable database cleanup | Passed; test database removed and absence verified |

## Still Open

- Downloadable canonical CSV template and operator guidance remain pending.
- Browser-level authenticated preflight-to-import execution remains pending.
- Provider-native Pathao and Steadfast column mappings remain pending real sample reports.
- Pathao and Steadfast settlement report API retrieval remain pending.
- Provider sandbox delivery callbacks remain pending.

## Recommended Next Work

1. Add a versioned downloadable canonical CSV template from the Admin workflow.
2. Add concise field and BDT-unit guidance beside the template action.
3. Run authenticated Admin proxy, backend preflight, import, history, and correction as one browser-level scenario.
4. Keep provider-specific adapters blocked until representative reports and contracts are available.
