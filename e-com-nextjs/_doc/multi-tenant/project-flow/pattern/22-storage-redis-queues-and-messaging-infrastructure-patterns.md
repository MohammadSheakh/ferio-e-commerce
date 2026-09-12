# Storage, Redis, Queues, and Messaging Infrastructure Patterns

This chapter is based on the focused source and test pass for `storage`,
`transactional-messaging`, `libs/redis`, `libs/queue`, and `libs/notification`.
These shared boundaries explain many feature implementations, but they do not
prove provider or load behavior in production.

## 259. Validated Redis cache-aside

`RedisService.getOrSet` reads JSON, passes the decoded value through a caller
parser, and treats malformed values as cache misses. Redis failures fall back to
the source function while logging a safe diagnostic.

- Source: `libs/redis/src/redis.service.ts`
- Test: `libs/redis/src/redis.service.spec.ts`
- Failure mode: trusting malformed cached data or making Redis availability a
  hard dependency for ordinary reads.

## 260. Explicit Redis invalidation contract

Cache invalidation accepts one or many keys and is best-effort. Feature services
must define tenant-scoped key builders and call invalidation after a successful
database mutation.

- Source: `RedisService.invalidate` and feature cache services
- Failure mode: stale cross-tenant data or an invalidation exception masking a
  committed write.

## 261. Redis client lifecycle ownership

The Redis module owns main, publish, and subscribe clients and disconnects them
on Nest shutdown. Reconnecting sockets are not left alive after application
termination.

- Source: `libs/redis/src/redis.lifecycle.ts`
- Failure mode: test/process hangs and leaked connections during deploys.

## 262. Queue-specific retry policy

BullMQ queues define attempts, exponential backoff, and bounded completed/failed
retention per queue. Payment, courier, reconciliation, retention, and messaging
work therefore have explicit retry behavior rather than one global default.

- Source: `libs/queue/src/bullmq.provider.ts`
- Failure mode: retry storms, unbounded Redis growth, or insufficient recovery.

## 263. Worker payload runtime validation

The email worker validates required job fields at runtime before dispatching to
the delivery service. TypeScript types alone are not trusted at the queue
boundary because job data is serialized and operationally mutable.

- Source: `libs/queue/src/processors/email.processor.ts`
- Failure mode: malformed jobs reaching providers with undefined credentials or
  recipients.

## 264. Queue name as a routing contract

Queue constants are centralized and processors switch explicitly on supported
job names. Unknown job names are observable rather than silently treated as a
successful delivery.

- Source: `bullmq.constants.ts` and `email.processor.ts`
- Failure mode: a producer typo creating a permanently invisible job.

## 265. Magic-byte upload validation

Storage validates declared MIME type against file signatures for JPEG, PNG, WebP,
and PDF. The filename or browser-provided MIME value is not enough to authorize
content.

- Source: `storage-validation.util.ts`
- Tests: storage validation specs
- Failure mode: uploading executable or mismatched content under a safe suffix.

## 266. Malware scanner fail-closed boundary

The scanner accepts only an explicit `{ clean: true }` response. Unavailable,
malformed, timed-out, or non-clean results become operational failure or malware
rejection rather than allowing the object to proceed.

- Source: `malware-scanner.ts`
- Test: `malware-scanner.spec.ts`
- Failure mode: treating a scanner outage as a clean result.

## 267. Production scanner configuration gate

Production startup requires an approved HTTPS malware scanner endpoint and
rejects placeholders, localhost, and invalid URLs. Local development may use an
explicit disabled scanner.

- Source: `createMalwareScanner` and `assertProductionScannerEndpoint`
- Test: scanner configuration cases
- Failure mode: production silently running without quarantine protection.

## 268. Tenant-prefixed private object key

R2 object keys are derived from trusted tenant context and a sanitized path.
Private objects are accessed through short-lived presigned URLs; clients cannot
choose another organization's prefix.

- Source: `storage/strategies/r2.strategy.ts` and object-key utilities
- Test: R2 tenant lifecycle and controller specs
- Failure mode: object namespace traversal or public evidence leakage.

## 269. Direct-upload finalize inspection

After a direct upload, the server inspects object metadata and content signature
before accepting it. Malware detection deletes the object on rejection.

- Source: `R2Strategy.inspectUploadedObject`
- Test: R2 strategy specs
- Failure mode: trusting a presigned PUT without validating what arrived.

## 270. Tenant-scoped object lifecycle

Listing and bulk deletion operate only over the ambient tenant prefix and refuse
unscoped lifecycle operations in strict mode.

- Source: R2 strategy tenant lifecycle methods
- Test: tenant-prefix and strict-context cases
- Failure mode: a cleanup job deleting another tenant's files.

## 271. Approved commerce-event mapping

Transactional messaging maps only known commerce events to approved templates.
Unknown events are ignored or rejected before creating a durable message.

- Source: `transactional-message.util.ts` and messaging service
- Test: mapping and template utility specs
- Failure mode: arbitrary event names creating uncontrolled provider traffic.

## 272. Durable message deduplication

Messages use event, reference type, reference id, and occurrence key to derive a
deduplication key. Repeated enqueue requests do not create duplicate durable
deliveries while later occurrences remain distinct.

- Source: `TransactionalMessagingService.enqueueAfterCommit`
- Test: transactional message utility/service specs
- Failure mode: one order event sending repeated customer messages.

## 273. Allowlisted template rendering

Template variables are defined per commerce event and validated before update.
Rendered messages persist the template version used so later edits do not alter
historical delivery evidence.

- Source: transactional message utilities/service
- Test: placeholder validation and version-copy cases
- Failure mode: templates rendering secrets or unverifiable historical content.

## 274. Encrypted messaging credentials

Channel credentials are encrypted and tamper-checked before provider dispatch.
Operational queue responses mask recipients and do not expose credential
payloads.

- Source: `messaging-credentials.util.ts` and messaging service
- Test: credential envelope specs
- Failure mode: provider secrets appearing in tenant admin responses or logs.

## 275. Adapter registry readiness

The message adapter registry reports readiness by channel and dispatches through
one provider-neutral contract. An unconfigured channel returns a structured
failure rather than a null adapter exception.

- Source: `message-adapter.registry.ts`
- Failure mode: the UI claiming a channel is available when no adapter is ready.

## 276. Definitive-failure provider fallback

The transactional dispatcher falls back to another configured channel/provider
only after a definitive failure. An unknown outcome stops fallback to avoid
duplicating a message whose delivery status is uncertain.

- Source: `transactional-message-dispatcher.ts`
- Test: dispatcher fallback/unknown cases
- Failure mode: sending the same notification through multiple channels after a
  timeout that may have succeeded.

## 277. Firebase optional initialization boundary

Firebase push setup checks required environment credentials and disables push
when they are absent, keeping local development usable. This is a deliberate
degraded mode, not evidence that push delivery is configured.

- Source: `libs/notification/src/firebase.service.ts`
- Failure mode: assuming a warning means push is operational.

## 278. Honest notification-provider gap

The Firebase service logs a successful token delivery message and catches send
errors internally, but the focused slice does not establish durable delivery
status, retry policy, or token redaction across every log path. Push readiness
requires a deeper provider/operations review.

- Evidence: Firebase service plus existing device/notification tests
- Release implication: do not mark push delivery as production-proven from
  initialization code alone.

## Evidence boundary

Focused tests provide source and unit evidence. R2, malware scanner, Firebase,
email, SMS, WhatsApp, and queue load behavior need `PROVIDER`, `LOCAL`, or
`STAGING` evidence before production readiness claims are made.
