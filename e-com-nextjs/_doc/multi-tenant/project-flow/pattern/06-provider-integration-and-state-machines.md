# Patterns 26-30: Providers And State Machines

## 26. Provider adapter boundary

Templates: `commerce-payments/adapters/`, `shipping/adapters/`, and messaging
adapters. Domain services depend on an interface; provider-specific payloads,
credentials, retries, and status mapping stay in the adapter boundary.

## 27. Webhook signature verification

Templates: shipping/payment webhook controllers and raw-body bootstrap in
`src/main.ts`. Verify signature before parsing/trusting provider input, then
deduplicate using a provider event identifier.

## 28. Durable outbox/dispatch

Templates: `transactional-messaging`, notification queues, and processors.
Study the separation between committing domain state and dispatching an
external message, including retry and operator visibility.

## 29. Retry with idempotent claim

Templates: `payment-recovery.processor.ts`, shipping polling/webhook
processors, and reconciliation processors. Each attempt is claimed atomically;
duplicate jobs become safe no-ops rather than duplicate side effects.

## 30. Domain state machine

Templates: order, payment, fulfillment, shipment, return, and closure services.
Read allowed transitions, terminal states, actor permissions, audit history,
and retry behavior together. A status enum alone is not a state machine.

### Senior questions

- Which system is authoritative for each state?
- What is the replay behavior for a webhook or queue job?
- Can a provider timeout leave a recoverable intermediate state?
- Are transitions audited with actor, tenant, and correlation metadata?
