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
