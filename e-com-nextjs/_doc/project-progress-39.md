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
