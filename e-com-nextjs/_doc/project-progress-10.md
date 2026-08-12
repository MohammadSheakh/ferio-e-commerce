# Ferio Project Progress 10

**Checkpoint date:** August 7, 2026  
**Milestone:** Release 1 — Transactional message outbox foundation  
**Status:** Durable post-commit event queue and admin observability implemented; provider dispatch awaits approval

## Delivered

### Backend

- Added a separate commerce messaging domain instead of coupling customer messages to the legacy internal user/socket notification module.
- Added durable `CommerceMessage` outbox records with event, purpose, template, masked operational recipient, reference, payload, availability, status, and error timestamps.
- Added `CommerceMessageAttempt` records for channel, provider, provider message ID, request/response payloads, result, errors, and attempt ordering.
- Added deterministic deduplication that suppresses callback replay while allowing later occurrences of the same shipment status.
- Added approved template mapping for order placed, confirmed, cancelled, shipment created, picked up, in transit, out for delivery, delivered, failed delivery, return in progress, returned, and shipment cancelled events.
- Enqueued order events only after successful order transactions return.
- Enqueued shipment-created and accepted courier-status events only after their database transactions commit.
- Isolated every enqueue failure with logging so it cannot roll back or fail order, confirmation, cancellation, shipment, or courier callback operations.
- Added an authenticated admin outbox API with status counts, event/reference search, pagination, masked recipients, and attempt history.
- Added migration `20260807050000_transactional_message_outbox`.

### Admin Web

- Added `/dashboard/messages` and sidebar navigation.
- Added outbox status cards, search, event/template/reference context, masked recipient, selected-channel state, attempt count, and status display.
- Added an explicit configuration notice instead of exposing non-functional send controls before channel policy and credentials are approved.

## Validation

| Project | Check | Result |
| --- | --- | --- |
| Backend | Prisma schema generation and validation | Passed; 31 schema fragments |
| Backend | Unit tests | Passed; 7 suites and 26 tests |
| Backend | Production build | Passed |
| Admin Web | Production build | Passed; messages page and BFF route generated |

## Still Open

- The product owner must approve transactional channel priority and fallback.
- No SMS, WhatsApp, or transactional email provider credentials are available.
- Provider-neutral dispatch adapters, worker locking, retries, uncertain-outcome handling, and delivery callbacks remain.
- Message attempts remain empty until a real adapter dispatches queued records.
- Migrations still require application and verification against a disposable PostgreSQL database.
- Courier sandbox verification and polling fallback remain blocked or pending.

## Recommended Next Work

1. Approve the first transactional channel, provider, fallback policy, and customer-facing templates.
2. Implement one configuration-gated provider adapter and an outbox worker with safe locking.
3. Record attempt outcomes and process authenticated delivery callbacks idempotently.
4. Apply migrations and run order-to-message integration tests against disposable infrastructure.
