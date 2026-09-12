# Patterns 109-124: Experience, Realtime, And Financial Safety

This block covers delivery personnel, chat/WebSockets, notifications, wallet,
warranty, service booking, storefront analytics, and operations health.

## 109. Socket ticket authentication

Templates: `socket-auth.controller.ts`, `socket-auth.service.ts`, and socket
auth tests. Issue a short-lived ticket through an authenticated HTTP context,
then validate it during the WebSocket handshake instead of trusting arbitrary
socket query identity.

## 110. Tenant-scoped socket room

Templates: `socket-room.service.ts`, gateway, and room tests. Room names and
membership derive from resolved tenant and authorized conversation/participant
data; a client cannot subscribe to another tenant by choosing a room string.

## 111. Transaction then realtime emission

Templates: chat conversation/message services. Commit message state first,
then emit a socket event and enqueue notifications. Realtime delivery is a
projection of durable state, not the source of truth.

## 112. Cursor message pagination

Templates: `message.controller.ts` and `message.service.ts`. Use before/after
cursors, a bounded limit, deterministic message ordering, and an extra row or
equivalent signal to determine whether another page exists.

## 113. Notification deduplication key

Template: `customer-notifications.service.ts` and wallet notification calls.
Use a domain event/status-derived key so retries and duplicate processors do
not create duplicate inbox entries.

## 114. Wallet immutable ledger

Template: `wallet.service.ts` and wallet tests. Every debit/credit writes an
immutable transaction history row with before/after balances and an idempotency
key; the current balance is not the only financial record.

## 115. Atomic balance conditional update

Template: wallet debit/top-up transaction. Update only when status and balance
conditions still hold, check affected-row count, then re-read the authoritative
post-update balance inside the transaction.

## 116. Feature-gated customer submission

Template: warranty controller and settings service. Check a server-side feature
setting before accepting a customer claim/booking; frontend hiding is not a
security or product gate.

## 117. Domain status transition policy

Templates: warranty and service-booking utility policies. Keep allowed
transitions in a small testable policy function and reject invalid jumps before
writing history or side effects.

## 118. Customer ownership query

Templates: customer account, warranty, delivery, and chat services. Load the
resource through both tenant and actor ownership criteria; possession of an ID
alone is insufficient.

## 119. Privacy-safe analytics event

Template: storefront analytics service/util tests. Accept only bounded,
sanitized event fields, avoid sensitive customer data, and aggregate through
tenant-scoped queries.

## 120. Rate-limited public ingestion

Template: storefront analytics controller rate-limit decorator. Public event
collection has a narrow DTO, rate limit, tenant resolution, and safe failure
behavior to prevent it becoming an unbounded write endpoint.

## 121. Dependency health aggregation

Template: operations-health service/tests. Combine database, Redis, queue, and
tenant-pool signals into a safe summary, distinguishing process liveness from
dependency readiness.

## 122. Admin queue pagination

Templates: warranty/admin, delivery, and notification list endpoints. Admin
work queues use bounded filters, count/page metadata, deterministic ordering,
and tenant membership/permission guards.

## 123. Tenant isolation fixture by context

Templates: wallet and storefront analytics isolation tests. Build two clients,
run each inside a different `runWithTenantContext()` value, use overlapping
business IDs, and assert both data and selected client boundaries.

## 124. Notification failure isolation

Template: chat notification processor and notification tests. A failed
notification should be recorded/retried without rolling back the already
committed business event or leaking one tenant's recipients into another.

## Study tests

```text
src/features/socket-gateway/tests/socket-auth.service.spec.ts
src/features/socket-gateway/tests/socket-room.service.spec.ts
src/features/chatting/conversation/tests/conversation.service.spec.ts
src/features/customer-notifications/tests/customer-notifications.service.spec.ts
src/features/wallet/tests/wallet.service.spec.ts
src/features/wallet/tests/wallet.tenant-isolation.spec.ts
src/features/warranty/tests/warranty.util.spec.ts
src/features/storefront-analytics/tests/storefront-analytics.tenant-isolation.spec.ts
src/features/operations-health/tests/operations-health.service.spec.ts
```
