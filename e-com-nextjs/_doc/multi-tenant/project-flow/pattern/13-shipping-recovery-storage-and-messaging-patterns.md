# Patterns 93-108: Shipping, Recovery, Storage, And Messaging

This block covers the next source slice: courier integrations, shipping
webhooks/polling, returns and recovery, settlement/reconciliation, object
storage, and transactional messaging.

## 93. Courier adapter registry

Templates: `src/features/shipping/adapters/` and `courier-router.service.ts`.
Resolve a supported courier adapter from tenant configuration and capabilities;
do not expose provider-specific branching throughout order services.

## 94. Courier credential normalization

Template: `shipping/utils/courier-credentials.util.ts` and its tests. Validate
provider-specific credentials, normalize field names, redact secrets, and fail
before making an external request.

## 95. Webhook durable log before processing

Templates: shipping webhook queue/processor and webhook tests. Persist or claim
the incoming event identity before applying shipment state, then process it
idempotently and retain failure evidence.

## 96. Polling claim and bounded retry

Templates: `shipping-polling.service.ts`, queue, and processor. Select bounded
eligible shipments, claim a poll attempt, map provider response, and schedule
retry with limits rather than polling indefinitely.

## 97. Provider status normalization

Template: shipping adapters and `shipping.util.ts`. Map provider-specific
strings to a finite internal status model while preserving raw provider detail
for support and audit.

## 98. Return-window eligibility policy

Template: `src/features/returns/utils/return.util.ts`. Evaluate delivery state,
return window, product/order conditions, and existing cases as a pure policy
before opening a return workflow.

## 99. Refund ownership and idempotency

Template: `src/features/refunds/services/refunds.service.ts` and tests. Verify
the order/payment belongs to the tenant, enforce legal refund state, and make
retries return the committed refund instead of creating another one.

## 100. RTO terminal-state handling

Template: `src/features/rto/rto.service.ts` and tests. Treat return-to-origin
states as explicit transitions with inventory, settlement, and customer effects;
terminal states must not be casually reprocessed.

## 101. Settlement report preflight

Template: `settlement-report-parser.service.ts` and tests. Parse headers and
money fields, report diagnostics, reject invalid rows safely, then import only
after preflight passes.

## 102. Reconciliation finding upsert

Template: `reconciliation.service.ts` and tests. Produce deterministic finding
identity, upsert results in a tenant transaction, preserve severity/status, and
allow safe retry of a run.

## 103. Signed storage URL boundary

Template: `src/features/storage/strategies/r2.strategy.ts` and storage
controller tests. The server validates the tenant key and permission before
issuing a short-lived signed URL; the client never chooses an arbitrary bucket
or tenant path.

## 104. Binary signature and size validation

Template: `storage-validation.util.ts`, malware scanner, and tests. Validate
declared MIME, actual bytes/signature, size, extension, and scan status before
publishing media.

## 105. Messaging channel adapter

Template: `transactional-messaging/adapters/` interface and registry. Domain
code submits a normalized message; the channel adapter owns provider details,
credentials, capability, and delivery result mapping.

## 106. Durable message dispatch status

Template: transactional-message queue/processor and dispatcher tests. Persist
pending/accepted/delivered/failed/unknown state, attach an idempotency key, and
make retry behavior visible to operators.

## 107. Operational alert severity ordering

Template: `reconciliation/utils/operational-alert.util.ts` and tests. Merge
signals deterministically, order by severity and recency, and produce an
operator-oriented alert without leaking provider secrets.

## 108. Tenant-scoped retry job

Template: reconciliation retry queue/tests and other feature queues. Encode the
tenant in the job identity, require tenant context at execution, verify the
original durable run, and reject cross-tenant retry IDs.

## Study tests

```text
src/features/shipping/tests/shipping-webhook.processor.spec.ts
src/features/shipping/tests/shipping-polling.processor.spec.ts
src/features/returns/tests/return.util.spec.ts
src/features/refunds/tests/refunds.tenant-isolation.spec.ts
src/features/settlements/tests/settlement-report-parser.service.spec.ts
src/features/reconciliation/tests/reconciliation.queue.spec.ts
src/features/storage/tests/storage.controller.spec.ts
src/features/transactional-messaging/tests/transactional-message-dispatcher.spec.ts
```
