# 7. Async Workers, Payments, And Notifications

Redis and BullMQ provide asynchronous execution. A queue is a reliability and
capacity boundary, not just a way to move code out of a controller.

## General Job Flow

```text
domain mutation
  -> durable tenant record/outbox-like message or job intent
  -> queue enqueue with organizationId when tenant work is needed
  -> processor receives trusted job envelope
  -> resolve tenant database from organizationId/control plane
  -> run idempotent work
  -> record success/failure/metrics
```

Workers cannot rely on HTTP request-local `AsyncLocalStorage`. They must rebuild
tenant context from a trusted organization envelope and never accept a database
URL from a job payload.

## Transactional Messaging

1. An order/payment/fulfillment event calls
   `TransactionalMessagingService.enqueueAfterCommit()`.
2. The service maps the event to an approved template definition.
3. It upserts a deduplication key so repeated business events do not create
   duplicate messages.
4. It renders a safe subject/body and stores the message in the tenant DB.
5. The queue schedules delivery.
6. The dispatcher selects channels and an adapter (email/SMS/WhatsApp/etc.).
7. The processor performs delivery with bounded retries.
8. Delivery status, provider response, and failures are recorded.

Template updates are admin-only, versioned, validated against allowed variables,
and audited.

## Payment Recovery

The payment recovery queue sweeps expired prepaid attempts and processes one
attempt at a time. The processor:

1. receives a tenant-stamped job;
2. resolves that organization database;
3. claims the attempt safely;
4. checks current payment/order state;
5. expires or reconciles the attempt idempotently;
6. releases/updates order state when appropriate;
7. records structured outcome and retry information.

Duplicate jobs must be harmless.

## Courier Webhooks And Polling

### Webhook

```text
provider callback
  -> raw-body/signature and tenant callback-token validation
  -> store callback/event log
  -> enqueue courier callback job
  -> processor normalizes provider status
  -> tenant shipment/order transaction
  -> notification/audit side effects
```

### Polling

```text
scheduler
  -> fan out READY/ACTIVE organizations
  -> enqueue poll jobs with organizationId
  -> resolve each tenant DB
  -> call courier adapter outside DB transaction
  -> persist status/event/attempt
```

Provider timeouts, circuit breakers, bounded retries, and dead-letter evidence
prevent one courier outage from blocking all tenants.

## Reconciliation And Settlement Workers

Reconciliation schedules scan tenant financial records and creates findings.
Settlement imports parse provider files, normalize rows, and compare expected
versus received amounts. Both are better understood as resumable, observable
workflows than as one large request.

## Retention

The retention queue fans out cleanup by organization. It deletes only data that
matches the configured retention policy, uses bounded batches, records deleted
counts, and reports deferred backlog. A retention failure for one tenant must
not stop the sweep for other tenants.

