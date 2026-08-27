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


===============================

# Ferio Project Progress 32

**Checkpoint date:** August 11, 2026  
**Milestone:** Release 1 — Admin settlement import and exception review  
**Status:** Admin operators can now submit normalized courier report rows, see whether the report applied or was quarantined, and inspect immutable row-level exception evidence

## Delivered

### Typed Admin integration

- Added typed settlement import and import-row contracts for applied and review states.
- Added authenticated Admin API proxies for listing and submitting settlement reports.
- Preserves backend status codes and domain error messages through the existing Admin API envelope.

### Report entry workflow

- Added provider, source evidence, provider report reference, bank reference, remitted amount, settlement timestamp, and batch-note fields.
- Added a compact operational row editor for provider row reference, tracking number, collection amount, courier fee, deduction, and note.
- Supports adding and removing rows without introducing decorative cards, shadows, gradients, or unnecessary color.
- Clearly states that source evidence becomes immutable after import.

### Immutable exception review

- Shows import status, provider, source, row totals, matched totals, settlement evidence, and import timestamp.
- Shows unmatched, ineligible, duplicate, and already-settled rows with their provider reference, tracking number, status, and reason.
- Distinguishes applied, needs-review, and exception states using restrained semantic status pills.
- Explains that mixed reports create no partial settlement and that corrections require a new report.

## Validation

| Project | Check | Result |
| --- | --- | --- |
| Admin Web | TypeScript validation through Next.js build | Passed |
| Admin Web | Production compilation | Passed |
| Admin Web | Static page generation | Passed; 41 of 41 pages |
| Admin Web | Settlement import API route generation | Passed |
| Admin Web | Reconciliation page bundle generation | Passed |

## Still Open

- Corrected-report supersession and explicit exception resolution remain pending.
- Provider-native CSV parsing and Pathao/Steadfast report API retrieval remain pending.
- Provider sandbox delivery callbacks remain pending.
- Browser-level authenticated integration against a running backend remains pending.
- Combined Customer Web, Admin Web, API, PostgreSQL, and Redis end-to-end execution remains pending.

## Recommended Next Work

1. Add an immutable supersession relationship from a corrected import to one `NEEDS_REVIEW` import.
2. Permit corrected rows to replace quarantined deduplication claims without editing historical evidence.
3. Prove that only one correction can supersede an import and only one corrected report can apply financially.
4. Add the correction action to Admin import history before provider-native parsers or remote retrieval adapters.


====================================

# Ferio Project Progress 33

**Checkpoint date:** August 11, 2026  
**Milestone:** Release 1 — Corrected settlement report recovery  
**Status:** One corrected report can now supersede a quarantined import, retain both immutable evidence sets, transfer row claims safely, and prevent competing corrections from posting multiple settlements

## Delivered

### Immutable supersession model

- Added explicit original-to-correction relationships and a terminal `SUPERSEDED` operational status.
- Preserves original report payloads, row payloads, classifications, references, and timestamps.
- Records correction resolution time and links both directions for operator review.
- Adds dedicated supersession audit evidence without rewriting the original import audit.

### Concurrent correction safety

- Acquires a short-lived database correction claim before running financial settlement logic.
- Allows stale claims to recover after fifteen minutes while rejecting active competing corrections.
- Transfers row deduplication claims from the quarantined report to the applied correction inside one transaction.
- Marks the original report superseded only when corrected settlement evidence and import evidence persist successfully.
- Releases the claim when correction validation or posting does not complete.

### Admin correction workflow

- Adds a `Correct report` action only to unresolved review imports.
- Prefills immutable source rows as a correction starting point while requiring a new report and bank reference.
- Locks the correction to the original courier provider.
- Shows which report a correction replaces and which correction superseded an original report.
- Keeps semantic styling restrained and consistent with the Ferio design language.

## Validation

| Project | Check | Result |
| --- | --- | --- |
| Backend | Prisma schema and client generation | Passed |
| Backend | Full migration deploy to disposable PostgreSQL | Passed; 19 of 19 migrations |
| Backend | Focused settlement/import/correction PostgreSQL suite | Passed; 1 suite and 7 tests |
| Backend | All PostgreSQL integration suites | Passed; 3 suites and 19 tests |
| Backend | Full unit tests | Passed; 19 suites and 69 tests |
| Backend | Production build including shared libraries | Passed |
| Admin Web | TypeScript and production build | Passed |
| Admin Web | Static page generation | Passed; 41 of 41 pages |
| Infrastructure | Disposable database cleanup | Passed; test database removed and absence verified |

## Still Open

- Provider-native CSV parsing and import preflight remain pending.
- Pathao and Steadfast settlement report API retrieval remain pending.
- Provider sandbox delivery callbacks remain pending.
- Browser-level authenticated correction execution remains pending.
- Combined Customer Web, Admin Web, API, PostgreSQL, and Redis end-to-end execution remains pending.

## Recommended Next Work

1. Define a provider-neutral parser result with normalized rows, warnings, rejected lines, and immutable source checksum.
2. Add strict CSV limits, encoding validation, required-header validation, and safe numeric parsing.
3. Expose preflight without financial posting so operators can correct malformed files before import.
4. Add provider-specific column mappings only when real Pathao and Steadfast sample reports are available.


======================================

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


=====================================

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


====================================

# Ferio Project Progress 36

**Checkpoint date:** August 11, 2026  
**Milestone:** Release 1 — Canonical settlement template and Admin auth boundary  
**Status:** Admin operators can download a versioned CSV template generated from the backend parser contract, and the live built proxy rejects template access without an admin session

## Delivered

### Versioned canonical template

- Generates the CSV filename, parser version, BDT decimal unit, size limit, row limit, required headers, optional headers, and content from one backend parser service.
- Uses a header-only template so no sample row can be mistaken for real settlement evidence.
- Keeps the template aligned with canonical parser v1 through a focused consistency test.
- Inherits the existing Admin settlement controller authentication and admin-role guards.

### Admin download workflow

- Adds an authenticated Admin API proxy for the template endpoint.
- Downloads the backend-provided content as a UTF-8 CSV with its versioned filename.
- Adds direct BDT decimal guidance beside the existing 1 MB and 500-row limits.
- Uses restrained pill actions, hairline boundaries, and plain operational copy from the Ferio design language.

### Live auth-boundary smoke

- Started the optimized Admin production server on port 3001.
- Requested `/api/settlements/imports/template` without session cookies.
- Verified HTTP `401` with `Admin session is required.` from the shared Admin API gate.
- Stopped the temporary server after verification.

## Validation

| Project | Check | Result |
| --- | --- | --- |
| Backend | Parser and template consistency suite | Passed; 1 suite and 6 tests |
| Backend | Full unit tests | Passed; 20 suites and 75 tests |
| Backend | Production build including shared libraries | Passed |
| Admin Web | TypeScript and production build | Passed |
| Admin Web | Static route and page generation | Passed; 43 of 43 |
| Admin Web | Live unauthenticated template proxy smoke | Passed; HTTP 401 with expected message |

## Still Open

- Authenticated success-path execution through Admin proxy, backend, PostgreSQL, and import history remains pending.
- Provider-native Pathao and Steadfast column mappings remain pending real sample reports.
- Pathao and Steadfast settlement report API retrieval remain pending.
- Provider sandbox delivery callbacks remain pending.
- Combined Customer Web, Admin Web, API, PostgreSQL, and Redis end-to-end execution remains pending.

## Recommended Next Work

1. Create a disposable PostgreSQL database and seed one admin plus one delivered COD collection.
2. Start backend and Admin production builds against disposable configuration.
3. Log in through the Admin proxy, download the template, preflight a valid CSV, import it, and verify immutable history.
4. Tear down processes and the disposable database after asserting settlement, collection, payment, and audit evidence.


===================================

# Ferio Project Progress 37

**Checkpoint date:** August 13, 2026  
**Milestone:** Release 1 — Authenticated full-stack settlement import proof  
**Status:** The built Admin Web and NestJS backend completed the canonical CSV settlement path against disposable PostgreSQL and local Redis, with persisted financial, parser, idempotency, and audit evidence

## Delivered

### Production startup repairs

- Declares `dotenv` as a direct backend dependency so the documented Prisma seed command compiles in a strict pnpm installation.
- Points `start:prod` to the actual Nest build entry at `dist/src/main`, allowing compiled application imports to resolve compiled shared libraries under `dist/libs`.
- Rebuilt the backend and verified the production artifact starts with PostgreSQL, Redis, BullMQ, authentication, settlement, and reconciliation modules initialized.

### Disposable full-stack fixture

- Created a dedicated `ferio_fullstack_test_20260813` PostgreSQL database on the configured server.
- Applied all 21 migrations and seeded one isolated admin, three delivery zones, and Pathao plus Steadfast providers.
- Seeded one delivered Steadfast COD shipment for BDT 1,500.00 with an expected, unsettled COD collection and unpaid order.
- Used isolated JWT secrets, disabled scheduled reconciliation, and left the configured application database untouched.

### Authenticated Admin workflow

- Built and started the Admin production application on an alternate local port because port 3001 was already occupied.
- Logged in through `/api/auth/login` and received the Admin HTTP-only session cookies.
- Downloaded the protected canonical v1 template through the Admin proxy.
- Preflighted one valid UTF-8 CSV row and received ready state, normalized minor-unit amounts, source checksum, normalized-row checksum, and parser version.
- Applied the exact preflighted CSV through the Admin proxy and loaded immutable protected import history.
- Replayed the same request and idempotency key, receiving the original import without a second settlement or import record.

### Persisted financial evidence

- Recorded one `APPLIED` import with one applied row and zero exceptions.
- Recorded one `MATCHED` settlement: gross BDT 1,500.00, courier fee BDT 50.00, expected/remitted BDT 1,450.00, and zero variance.
- Transitioned the COD collection to `SETTLED` and the order payment state to `PAID`.
- Persisted canonical parser v1, source-file checksum, and normalized-row checksum evidence.
- Persisted one `COURIER_SETTLEMENT_RECORDED` and one `COURIER_SETTLEMENT_REPORT_IMPORTED` Admin API audit event.

## Validation

| Project | Check | Result |
| --- | --- | --- |
| Backend | Prisma migration deployment | Passed; 21 of 21 migrations |
| Backend | Seed command | Passed after direct `dotenv` dependency repair |
| Backend | Production build and launch | Passed from `dist/src/main` |
| Backend | Redis connectivity | Passed; main, pub, and sub clients connected |
| Admin Web | Production build | Passed; 43 of 43 static pages generated |
| Full stack | Authenticated login, template, preflight, import, and history | Passed; all Admin proxy responses HTTP 200 |
| Full stack | Idempotent import replay | Passed; same import ID, one import, and one settlement |
| PostgreSQL | Settlement and payment invariants | Passed; matched/settled/paid with zero variance |
| PostgreSQL | Parser and audit evidence | Passed; both checksums, parser v1, and two expected audit actions |
| Cleanup | Disposable database removal | Passed; zero matching databases remain |

## Still Open

- Provider-native Pathao and Steadfast report column mappings remain pending real sample reports.
- Provider settlement report API retrieval remains pending credentials and provider contracts.
- Courier callback authentication, replay, retry, and provider-sandbox proof remain incomplete.
- Port 3001 was occupied by a pre-existing local process; the isolated Admin smoke used port 3011 without altering that process.
- Local Redis 6.0.16 works for this proof, but BullMQ recommends Redis 6.2 or newer.

## Recommended Next Work

1. Inspect the current courier webhook authentication and deduplication boundary for both providers.
2. Add deterministic callback fixtures for valid, invalid, duplicate, and out-of-order events.
3. Prove callback persistence, normalized shipment transitions, replay safety, and audit/exception evidence against disposable infrastructure.
4. Keep provider-native payload details isolated behind adapters until real sandbox contracts and credentials are available.


==============================

# Ferio Project Progress 38

**Checkpoint date:** August 13, 2026  
**Milestone:** Release 1 — Courier callback authentication, replay, and recovery evidence  
**Status:** Pathao and Steadfast callback fixtures now prove authentication, rejected-attempt isolation, concurrent replay safety, failed-attempt recovery, delivery effects, and out-of-order retention against disposable PostgreSQL

## Delivered

### Callback security boundary

- Verifies Pathao shared-secret headers and Steadfast bearer tokens with constant-time digest comparison.
- Authenticates before parsing or claiming a provider event identity.
- Retains rejected callbacks with redacted credential headers and a separate random evidence key, preventing an attacker from poisoning the later valid event key.
- Keeps unsupported providers and missing shipment identities as explicit HTTP failures.

### Replay and retry control

- Adds atomic database claims so concurrent deliveries of one authenticated event produce one processing attempt and one shipment event.
- Returns completed callbacks as harmless duplicates without repeating shipment, order, inventory, COD, message, or audit effects.
- Tracks attempt count, processing start, last attempt, completion, and processing error evidence.
- Releases failed claims for safe provider replay and permits stale in-progress claims to recover after a five-minute lease.
- Clears prior error evidence only when the next processing attempt is claimed.

### Provider-state evidence

- Proves a rejected Pathao callback cannot block the same valid callback.
- Proves a failed Steadfast delivery callback can recover after its shipment becomes available, then creates expected COD collection evidence.
- Proves an older Pathao event is retained with an ignored reason while the accepted shipment state does not regress.
- Keeps deterministic provider fixtures separate from production adapters until real sandbox payload contracts are available.

### Admin observability

- Adds an admin-guarded callback evidence endpoint returning the latest 100 retained attempts.
- Adds an authenticated Admin proxy route for callback evidence.
- Adds a restrained Shipping table with received time, courier, semantic processing status, attempt count, last attempt, and error/completion evidence.
- Uses hairline dividers, uppercase micro-labels, grayscale structure, and muted semantic pills from the Ferio design language.

### Test maintenance

- Replaces the brittle hard-coded migration-count assertion with the actual migration-directory count.
- Adds callback adapter authentication tests and PostgreSQL callback integration coverage.

## Validation

| Project | Check | Result |
| --- | --- | --- |
| Backend | Shipping unit tests | Passed; 2 suites and 4 tests |
| Backend | Full unit tests | Passed; 21 suites and 77 tests |
| Backend | Production build | Passed |
| PostgreSQL | Full migration deployment | Passed; 22 of 22 migrations |
| PostgreSQL | Callback integration proof | Passed; 3 callback scenarios |
| PostgreSQL | Full integration suite | Passed; 4 suites and 24 tests |
| Admin Web | Production build | Passed; 44 of 44 static pages generated |
| Cleanup | Disposable database removal | Passed; zero matching databases remain |

## Still Open

- Queue-driven automatic retry for failed or abandoned callback attempts remains pending.
- Real Pathao and Steadfast sandbox payload/signature contracts, credentials, and outage behavior remain pending provider access.
- Provider-native settlement report mappings and API retrieval remain pending real samples and contracts.
- Polling fallback remains pending provider-specific API behavior.
- Local PostgreSQL integration output still reports the existing pg SSL compatibility warning and a concurrent-query deprecation warning.

## Recommended Next Work

1. Add a BullMQ courier-callback retry job keyed by retained callback identity.
2. Recover failed and expired processing leases without duplicating accepted events.
3. Expose queue health and manual retry controls beside callback evidence.
4. Prove scheduled and operator retries against disposable PostgreSQL and Redis before provider sandbox access.


=================================


# Ferio Project Progress 39

**Checkpoint date:** August 13, 2026  
**Milestone:** Release 1 — Courier callback retry queue and operator recovery  
**Status:** Failed, abandoned, and stale courier callbacks now have configurable BullMQ sweeps, bounded deterministic retries, queue health, and audited Admin recovery controls

## Delivered

### Dedicated callback queue

- Registers a separate Ferio courier-callback BullMQ queue with exponential backoff, bounded attempts, and retained completion/failure evidence.
- Adds a configurable scheduler for automatic recovery sweeps without coupling callback work to reconciliation jobs.
- Uses deterministic retry job IDs derived from callback identity and next attempt number.
- Keeps the scheduler disabled by default until the deployment explicitly enables the documented environment control.

### Recoverable callback discovery

- Selects only authenticated, unprocessed callbacks below the configured maximum attempt count.
- Recovers callbacks with processing errors, expired five-minute claims, or an abandoned pre-claim record.
- Orders recovery by oldest attempt/receipt and bounds each sweep to 100 records.
- Prevents rejected, completed, actively processing, and attempt-exhausted callbacks from operator retry.

### Worker behavior

- Routes sweep jobs to recoverable callback discovery and individual retry jobs to retained callback processing.
- Reuses the existing atomic database claim before applying shipment effects.
- Lets BullMQ retry transient failures while preserving callback attempt counts and error evidence in PostgreSQL.
- Treats already-completed callback replay as a harmless successful job.

### Admin operations

- Adds admin-guarded queue health with availability, scheduler timing, queue counts, recovery count, and maximum attempts.
- Adds an audited operator retry endpoint with deterministic job evidence.
- Adds authenticated Admin proxy routes for health and retry actions.
- Extends the Shipping callback table with calm queue status, recovery count, sweep cadence, and a restrained `Queue retry` pill action only when retry is valid.

### Configuration

- Documents callback retry enablement, sweep interval, and maximum-attempt environment variables.
- Validates enablement, a 1–1440 minute sweep interval, and a 1–20 attempt limit during backend startup.

## Validation

| Project | Check | Result |
| --- | --- | --- |
| Backend | Focused callback queue/worker tests | Passed; 2 suites and 6 tests |
| Backend | Full unit tests | Passed; 23 suites and 83 tests |
| Backend | Production build | Passed |
| PostgreSQL | Full migration deployment | Passed; 22 of 22 migrations |
| PostgreSQL | Retained callback integration proof | Passed; 1 suite and 3 tests |
| Redis/BullMQ | Callback and reconciliation runtime smokes | Passed; 2 suites and 6 tests |
| Admin Web | Production build | Passed; 45 of 45 static pages generated |
| Cleanup | Disposable PostgreSQL and Redis removal | Passed; zero disposable infrastructure remains |

## Still Open

- Real Pathao and Steadfast sandbox payload, signature, outage, and retry behavior remains pending provider access.
- Provider polling fallback remains pending provider-specific status API contracts.
- Provider-native settlement report mappings and retrieval remain pending real samples and credentials.
- Automatic callback sweeps must be explicitly enabled in deployment configuration after operational review.
- Local Redis 6.0.16 passes this smoke, but BullMQ recommends Redis 6.2 or newer.

## Recommended Next Work

1. Add a provider-neutral shipment status polling contract and durable poll evidence.
2. Define bounded polling cadence, terminal-state stop rules, and outage backoff.
3. Expose polling health and exceptions without inventing provider-specific payload fields.
4. Keep concrete Pathao and Steadfast polling calls configuration-gated until sandbox contracts are available.
