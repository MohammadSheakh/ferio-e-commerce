# Reports, Settlements, Reconciliation, Health, and Settings Patterns

This chapter is based on the focused source and test pass for `reports`,
`settlements`, `reconciliation`, `operations-health`, and `settings`. It is a
study guide for recurring patterns and does not claim production evidence.

## 239. Permission-aware report projection

Reports use the actor permission set to decide whether customer fields are
permitted or masked. The decision is applied in the service/export projection,
not only in the frontend.

- Source: `reports.service.ts`
- Test: `reports.service.spec.ts`
- Failure mode: a user exporting data the UI hid.

## 240. Tenant-local report database

Overview and export queries resolve the tenant database before reading orders,
shipments, or customer fields. Identical records in two stores produce separate
report results.

- Source: `ReportsService.db`
- Test: `reports.tenant-isolation.spec.ts`
- Failure mode: cross-store revenue or customer leakage.

## 241. Keyset report accumulation

Large report exports iterate through bounded keyset pages and accumulate only
the required summary/stream output, rather than retaining every order in an
unbounded array.

- Source: `reports.service.ts`
- Test: keyset accumulation case
- Failure mode: export memory growth as tenant volume increases.

## 242. Integer-money report arithmetic

Report utilities sum money using integer minor units and avoid floating-point
conversion. Date periods are normalized to an inclusive UTC boundary.

- Source: `reports/utils/report.util.ts`
- Test: `report.util.spec.ts`
- Failure mode: visible financial rounding drift.

## 243. CSV formula-injection protection

Export cells and masked names are normalized before CSV output. Values beginning
with spreadsheet formula characters are escaped or neutralized.

- Source: `report.util.ts`
- Test: `report.util.spec.ts`
- Failure mode: a downloaded report executing content in a spreadsheet.

## 244. Canonical settlement CSV template

The downloadable settlement template and parser share one canonical header and
version contract. Preflight validates file type, headers, row count, and money
units before posting any settlement data.

- Source: `settlement-report-parser.service.ts`
- Test: `settlement-report-parser.service.spec.ts`
- Failure mode: silently importing a provider report with shifted columns.

## 245. Settlement row identity uniqueness

Settlement preflight rejects duplicate provider row references and prevents
fees/deductions from exceeding the collected amount.

- Source: settlement parser
- Test: duplicate identity and deduction cases
- Failure mode: double-posting or creating a negative settlement outcome.

## 246. Settlement operational row limit

Imported reports have an explicit maximum row count. Oversized files return a
diagnostic instead of creating an unbounded synchronous operation.

- Source: settlement parser
- Test: 500-row operational limit case
- Failure mode: upload-triggered resource exhaustion.

## 247. Settlement evidence before COD paid

Settlement matching marks a COD order paid only when collection evidence and
matching shipment/order identity are present. A shortfall remains visible and
does not become a paid order.

- Source: `settlements.service.ts`
- Test: matched batch and shortfall cases
- Failure mode: financial state being promoted from incomplete courier data.

## 248. Settlement idempotency race handling

Settlement commands return the original result for a repeated idempotency key
and translate a unique race into the committed settlement instead of creating a
second posting.

- Source: `settlements.service.ts`
- Test: replay and idempotency-race cases
- Failure mode: duplicate COD credits under operator retries.

## 249. Durable reconciliation run

Reconciliation stores a durable run record separate from the scan transaction.
Failed scans remain visible and can be retried with the same run identity.

- Source: `reconciliation.service.ts`
- Test: failed-run and retry cases
- Failure mode: a failed scan disappearing as if it never ran.

## 250. Reconciliation finding upsert

Detected mismatches are persisted as findings and stale conditions can be
auto-resolved. Findings remain tenant-local and carry enough evidence for an
operator to investigate.

- Source: `reconciliation.service.ts`
- Test: finding persistence and tenant-isolation cases
- Failure mode: alert duplication on every scan or stale alarms forever.

## 251. Reconciliation idempotent replay

Retrying a completed or known run returns the durable run rather than creating a
new logical operation. The processor routes scheduled and retry jobs explicitly.

- Source: reconciliation queue/processor/service
- Tests: queue and processor specs
- Failure mode: retry storms producing duplicate runs.

## 252. Operational alert severity ordering

Alert utilities remove empty signals and prioritize critical, oldest evidence so
operators see the most actionable condition first.

- Source: `reconciliation/utils/operational-alert.util.ts`
- Test: `operational-alert.util.spec.ts`
- Failure mode: a noisy low-value signal hiding a critical financial mismatch.

## 253. Tenant-scoped reconciliation retry

Tenant retry jobs carry the tenant identity and are rejected when required
tenant context is missing. A worker cannot accidentally scan the legacy or
another tenant database.

- Source: reconciliation queue/processor
- Test: tenant retry queue cases
- Failure mode: background work running against an unintended database.

## 254. Health/readiness evidence aggregation

Operations health combines runtime, queue, commerce, provider, and backup
evidence into one operator response. Missing dependencies degrade the report
instead of throwing away all health information.

- Source: `operations-health.service.ts`
- Test: `operations-health.service.spec.ts`
- Failure mode: a single unavailable dependency making diagnosis impossible.

## 255. Credential-free health response

Health and readiness responses summarize status without returning secrets,
connection strings, or provider credentials. Detailed evidence stays behind
appropriate operator access.

- Source: operations-health controller/service
- Failure mode: a public health endpoint becoming a secret inventory.

## 256. Settings filter and sort allowlist

Settings pagination accepts only known filters and sort fields, falling back to
safe defaults for invalid values. Both offset and cursor contracts are exposed
explicitly.

- Source: `settings.service.ts` and settings DTOs
- Test: `settings.service.spec.ts`
- Failure mode: arbitrary query fields causing unstable or expensive queries.

## 257. Audited settings transaction and cache invalidation

Settings upsert/delete and audit recording share one transaction. Successful
mutations then invalidate tenant-scoped Redis keys so subsequent reads observe
the new configuration.

- Source: `settings.service.ts`
- Test: `commerce-settings.service.spec.ts`
- Failure mode: an audit row without the setting change or stale feature state.

## 258. Staged feature-flag enforcement

Feature flags are enforced server-side at the relevant controller/service
boundary. A paused feature may return an empty safe read or reject writes, and
analytics can be accepted without persistence when collection is paused.

- Source: settings services/controllers and feature consumers
- Tests: `staged-feature-flags.spec.ts`
- Failure mode: a rollout flag that only changes navigation but not behavior.

## Evidence boundary

These focused tests provide source and unit evidence. Large tenant exports,
settlement imports, reconciliation queue fairness, backup evidence freshness,
and production health routing still require `LOCAL`, `STAGING`, `PROVIDER`, or
`PILOT` evidence in `FULL-AUDIT-MATRIX.md`.
