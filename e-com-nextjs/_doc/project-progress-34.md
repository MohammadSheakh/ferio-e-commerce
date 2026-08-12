# Ferio Project Progress 34

**Checkpoint date:** August 11, 2026  
**Milestone:** Release 1 — Settlement CSV parser and preflight  
**Status:** Admin operators can validate canonical settlement CSV files, inspect precise diagnostics and source checksums, and populate normalized rows without creating any settlement or database evidence

## Delivered

### Canonical parser contract

- Defines required headers for provider row reference, tracking number, collected amount, courier fee, and other deduction, with an optional note column.
- Accepts UTF-8 CSV with an optional BOM, CRLF or LF line endings, quoted fields, escaped quotes, and commas inside quoted notes.
- Normalizes header whitespace and hyphens while warning about unsupported columns.
- Returns provider, file name, SHA-256 source checksum, byte size, normalized headers, row totals, diagnostics, and normalized rows.

### Safe operational limits

- Rejects non-CSV file names, null bytes, malformed quotes, empty files, and files above 1 MB.
- Limits reports to 500 data rows and reports blank lines without silently treating them as settlements.
- Requires exact non-negative BDT decimal syntax with no floating-point conversion drift.
- Enforces the existing maximum minor-unit amount and rejects fees plus deductions above collection.
- Detects duplicate provider row references and tracking numbers before import.

### Admin preflight workflow

- Adds an authenticated preflight proxy with no idempotency key or database mutation because validation is side-effect free.
- Adds restrained CSV selection, canonical-header guidance, preview controls, accepted/rejected counts, warnings, and errors.
- Populates editable import rows only when backend preflight returns `ready`.
- Displays a shortened source checksum so operators can identify the exact validated file.

## Validation

| Project | Check | Result |
| --- | --- | --- |
| Backend | Focused parser unit suite | Passed; 1 suite and 5 tests |
| Backend | Full unit tests | Passed; 20 suites and 74 tests |
| Backend | Production build including shared libraries | Passed |
| Admin Web | TypeScript and production build | Passed |
| Admin Web | Static route and page generation | Passed; 42 of 42 |
| Admin Web | Settlement preflight API route generation | Passed |

## Still Open

- Preflight checksum and parser evidence are not yet bound to the eventual immutable import record.
- Provider-native Pathao and Steadfast column mappings remain pending real sample reports.
- Pathao and Steadfast settlement report API retrieval remain pending.
- Provider sandbox delivery callbacks remain pending.
- Browser-level authenticated CSV preflight and import execution remain pending.

## Recommended Next Work

1. Add optional parser evidence fields to the import command and persistence model.
2. Recompute normalized row evidence during import and reject checksum or row-hash mismatches.
3. Show the bound file name and checksum in immutable Admin import history.
4. Keep manual JSON/API imports valid without pretending they originated from a CSV preflight.
