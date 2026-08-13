# Ferio Project Progress 40

**Checkpoint date:** August 13, 2026  
**Milestone:** Release 1 — Provider-neutral courier polling and outage controls  
**Status:** Courier polling now has durable attempts, source-tagged provider evidence, shared normalized shipment rules, bounded BullMQ cadence/backoff, terminal stop rules, queue health, and Admin visibility without inventing Pathao or Steadfast API contracts

## Delivered

### Provider-neutral polling contract

- Extends the courier adapter boundary with polling configuration and a provider-neutral tracking identity input.
- Requires a configured adapter polling implementation before a shipment can be queued.
- Keeps Pathao and Steadfast polling explicitly unavailable until real status endpoints and payload contracts are confirmed.
- Exposes provider polling readiness separately from shipment-creation credential readiness.

### Durable poll lifecycle

- Adds queued, processing, succeeded, failed, and skipped poll-attempt states with correlation, queue, raw response, normalized status, error, timing, shipment, and operator evidence.
- Adds shipment-level last/next poll time, consecutive failure count, and current polling error.
- Tags retained provider evidence as webhook or poll while keeping callback evidence lists callback-only.
- Applies poll results through the existing normalized shipment event path, preserving out-of-order, transition, delivery, COD, RTO, inventory, message, and audit rules.

### Cadence and outage behavior

- Registers a dedicated courier polling BullMQ queue and configurable scheduler.
- Selects only active-provider, non-terminal, due shipments without queued or processing attempts.
- Stops polling after delivered, returned, cancelled, or RTO outcomes.
- Schedules successful non-terminal polls at a 15-minute cadence.
- Records provider failures durably and applies exponential 15-minute-to-6-hour backoff.
- Keeps polling disabled by default until deployment and provider contracts are approved.

### Admin operations

- Adds admin-guarded poll history, polling queue health, and manual shipment-poll endpoints.
- Audits operator-queued shipment polls.
- Adds authenticated Admin proxies for poll evidence, health, and manual polling.
- Extends Shipping with polling readiness, eligible count, cadence, guarded `Poll now` actions, and a hairline poll-evidence table using restrained semantic pills.

## Validation

| Project | Check | Result |
| --- | --- | --- |
| Backend | Focused shipping tests | Passed; 5 suites and 12 tests |
| Backend | Full unit tests | Passed; 24 suites and 85 tests |
| Backend | Production build | Passed |
| PostgreSQL | Full migration deployment | Passed; 23 of 23 migrations |
| PostgreSQL | Webhook and polling integration proof | Passed; 1 suite and 5 tests |
| Redis/BullMQ | Polling, callback, and reconciliation runtime smokes | Passed; 3 suites and 7 tests |
| Admin Web | Production build | Passed; 47 of 47 static pages generated |
| Cleanup | Disposable PostgreSQL and Redis removal | Passed; zero disposable infrastructure remains |

## Still Open

- Concrete Pathao and Steadfast polling calls remain blocked on verified sandbox endpoints, credentials, payloads, status fields, and rate limits.
- Real-provider outage, throttling, malformed-response, cancellation, and RTO polling scenarios remain pending sandbox access.
- Provider-native settlement report mappings and retrieval remain pending real samples and credentials.
- Automatic polling and callback recovery remain disabled by default pending deployment review.
- Local Redis 6.0.16 passes the smoke, but BullMQ recommends Redis 6.2 or newer.

## Recommended Next Work

1. Define transactional channel priority and fallback as a provider-neutral policy.
2. Persist channel selection, fallback reason, attempt order, and terminal outcome evidence.
3. Keep concrete SMS, WhatsApp, and email dispatch disabled until providers and consent rules are approved.
4. Expose operational health and failed-message recovery using the existing restrained Admin message view.
