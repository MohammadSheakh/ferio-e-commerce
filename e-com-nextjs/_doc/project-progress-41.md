# Ferio Project Progress 41

**Checkpoint date:** August 13, 2026
**Milestone:** Release 1 — Transactional channel routing and safe fallback controls
**Status:** The transactional outbox now has a versioned provider-neutral routing policy, immutable per-message route evidence, append-only attempts, definitive-failure fallback, uncertain-outcome duplicate protection, a durable BullMQ dispatch path, and Admin operational visibility while real delivery remains safely disabled

## Delivered

### Routing policy and provider boundary

- Adds an audited singleton transactional policy with ordered WhatsApp, SMS, and email channels, versioning, activation state, and definitive-failure fallback control.
- Adds a provider-neutral channel adapter contract and readiness registry without inventing SMS, WhatsApp, or email provider payloads.
- Allows priority to be recorded while refusing policy activation until at least one approved provider adapter is configured.
- Keeps deployment dispatch disabled by default through explicit environment configuration.

### Durable delivery evidence

- Snapshots the active channel plan and policy version onto each message before dispatch.
- Retains attempt order, selected channel, provider identity, provider message ID, request/response evidence, fallback reason, terminal reason, and timestamps.
- Falls back only after a definitive provider failure.
- Stops automatically on an unknown provider outcome so a timeout cannot broadcast duplicate customer messages across channels.
- Preserves prior attempts during audited operator retry while applying a fresh routing-policy snapshot.

### Queue and Admin operations

- Registers a dedicated transactional-message BullMQ queue with bounded retries, configurable sweeps, batch limits, and queue health.
- Adds admin-guarded policy, health, and retry endpoints with append-only audit evidence for policy changes and recovery actions.
- Extends the Messages workspace with routing status, provider readiness, eligible backlog, route/fallback evidence, terminal reasons, and guarded retry controls.
- Keeps recipients masked and provider payloads backend-only.

## Validation

| Project | Check | Result |
| --- | --- | --- |
| Backend | Prisma composed-schema validation and client generation | Passed |
| Backend | Focused routing safety tests | Passed; 1 suite and 2 tests |
| Backend | Full unit suite | Passed; 25 suites and 87 tests |
| Backend | Production build | Passed |
| Admin Web | Production build | Passed; 48 of 48 static pages generated |

## Still Open

- Product-owner approval for exact transactional channel order and fallback policy remains blocked.
- Concrete WhatsApp, Bangladesh SMS, and email providers, credentials, template contracts, callback status mappings, and sandbox access remain pending.
- Live acceptance, delivery, rejection, throttling, timeout, duplicate, and provider-outage proof remains pending approved sandboxes.
- The new migration has schema validation and build proof but still requires application to the target deployment database.
- Transactional template content, locale strategy, versioning, and customer-facing normalized wording remain pending.

## Recommended Next Work

1. Add versioned transactional template governance for the existing Release 1 event triggers.
2. Define normalized customer-facing status language without exposing internal or provider codes.
3. Keep templates inactive until Bangla/English content and provider-specific approval requirements are decided.
4. Expose template readiness and missing-trigger coverage in the existing restrained Admin Messages workspace.
