# Order, Shipping, Returns, Refunds, and RTO Patterns

This chapter is based on the focused source and test pass for `order`,
`shipping`, `returns`, `refunds`, and `rto`. These are recurring implementation
patterns, not proof that every lifecycle branch has passed a live integration.

## 177. Order idempotency key

Order placement requires a normalized idempotency key, hashes it, and checks for
an existing order before creating another one. The key is evaluated inside the
tenant database boundary.

- Source: `src/features/order/order.service.ts`
- Test: `order-reservation.service.spec.ts`
- Failure mode: browser retries creating duplicate orders or reservations.

## 178. Explicit order transition policy

Confirmation, cancellation, fulfillment, and pickup operations validate the
current state before changing it. A generic status assignment is not used as a
substitute for domain transition rules.

- Source: `order.service.ts` and `order/utils/order.util.ts`
- Test: `order.util.spec.ts`
- Failure mode: skipping payment, warehouse, or delivery prerequisites.

## 179. Atomic stock reservation

Order placement calculates aggregate availability, increments reservation state,
and creates reservation movement evidence inside a transaction. Insufficient
stock fails before the order can become operationally active.

- Source: `reserveOrderItems` in `order.service.ts`
- Test: `order-reservation.service.spec.ts`
- Failure mode: overselling under concurrent checkout.

## 180. Exact inverse reservation release

Expiry, cancellation, and prepaid retry release the exact quantities previously
reserved and create inverse movement evidence. The service refuses release when
durable stock and reservation state disagree.

- Source: `releaseReservations` in `order.service.ts`
- Test: `order-reservation.service.spec.ts`
- Failure mode: negative reserved stock or silent inventory drift.

## 181. Tenant-safe order reference lookup

Public tracking normalizes an order reference and resolves it only within the
current tenant database. Overlapping references in two stores therefore remain
isolated.

- Source: `OrderService.trackOrder`
- Test: `order-reference.tenant-isolation.spec.ts`
- Failure mode: an order number becoming a cross-tenant oracle.

## 182. Operational order timeline projection

Order, shipment, return, refund, and courier evidence are projected into one
customer-safe timeline and sorted by event time. Raw provider payloads are not
required to render the operational history.

- Source: `order/utils/order-timeline.util.ts`
- Test: `order-timeline.util.spec.ts`
- Failure mode: exposing internal notes or presenting events out of order.

## 183. Courier adapter contract

Each courier implements a shared adapter interface for shipment creation,
status normalization, webhook parsing, and optional polling. The shipping
service and router remain provider-neutral.

- Source: `shipping/adapters/courier-adapter.interface.ts` and adapters
- Test: `shipping.adapters.spec.ts`
- Failure mode: provider-specific conditionals spreading through domain code.

## 184. Courier credential envelope

Courier credentials are encrypted before persistence and overlaid only for the
current async operation. A tenant credential does not mutate process-global
configuration for concurrent requests.

- Source: `shipping/utils/courier-credentials.util.ts`
- Test: `courier-credentials.util.spec.ts`
- Failure mode: leaking one merchant's courier credentials into another request.

## 185. Provider status normalization

Raw courier statuses are converted into the platform state vocabulary before
they reach order/shipment rules. Terminal regressions are rejected while
allowed failed-delivery retry transitions remain explicit.

- Source: `shipping/utils/shipping.util.ts` and adapters
- Test: `shipping.util.spec.ts`
- Failure mode: every provider creating a different internal lifecycle.

## 186. Durable webhook log before processing

A courier webhook is retained as durable evidence before asynchronous business
processing. The processor can retry a retained callback without requiring the
provider to resend it.

- Source: `shipping-webhook.processor.ts` and `ShippingService`
- Tests: `shipping-webhook.processor.spec.ts`, queue specs
- Failure mode: losing a delivery update during a worker or database outage.

## 187. Recoverable polling attempt

Polling creates durable attempts with deterministic identity, then workers claim
due work and retry within bounded policy. Manual polling requires tenant context
in tenant mode.

- Source: `shipping-polling.service.ts`, polling queues/processors
- Tests: polling queue and processor specs
- Failure mode: duplicate provider calls or a background job using the wrong DB.

## 188. Return-window eligibility policy

Return eligibility is a pure policy result containing approval status, reasons,
remaining quantities, and a window end. Delivery evidence and configured policy
are evaluated before a case can be created.

- Source: `returns/utils/return.util.ts` and `ReturnsService`
- Test: `return.util.spec.ts`
- Failure mode: approving an undelivered or expired order.

## 189. Return quantity conservation

Requested, approved, received, accepted, and already-used quantities are
reconciled before inventory changes. Partial approval must account for every
item rather than silently defaulting missing quantities.

- Source: `ReturnsService` review/inspection paths
- Test: `returns.service.spec.ts`
- Failure mode: refunding more units than were delivered or returned.

## 190. Return inspection inventory disposition

Inspection separates sellable, damaged, and lost outcomes. Only sellable
quantities return to available inventory; damaged units remain unavailable and
all movements are traceable.

- Source: `restoreInspectedInventory` in `returns.service.ts`
- Test: sellable and damaged inspection cases
- Failure mode: returned damaged stock becoming sellable.

## 191. Refund ownership and tenant isolation

Refund and return lookup always uses the resolved tenant database and validates
the referenced order/return relationship before mutation.

- Source: `refunds.service.ts` and `returns.service.ts`
- Tests: `refunds.tenant-isolation.spec.ts`, `returns.tenant-isolation.spec.ts`
- Failure mode: refunding a same-id record from another tenant.

## 192. Refund eligibility and cap

Refund creation calculates the remaining refundable amount from prior attempts,
return quantities, payment method, and order state. COD and already exhausted
refunds are rejected by domain policy.

- Source: `RefundsService.refundEligibilityInTransaction`
- Test: `refunds.service.spec.ts`
- Failure mode: over-refunding or refunding an unsupported payment method.

## 193. Refund settlement evidence

Successful refund results require an external/provider or receipt reference;
failed results require a reason. Attempts are recorded with actor and provider
metadata before order refund status is synchronized.

- Source: `RefundsService.recordResult`
- Test: successful evidence and required-evidence cases
- Failure mode: a financial success state with no settlement proof.

## 194. Refund attempt idempotency

An idempotency key is hashed and checked inside the transaction before creating
a refund attempt. A repeated command returns the existing refund rather than
creating another financial instruction.

- Source: `RefundsService.recordResult`
- Failure mode: operator double-clicks producing duplicate refunds.

## 195. RTO terminal reconciliation

RTO inspection reconciles sellable, damaged, and lost quantities against active
reservations before releasing them. It then moves the order and RTO case to
terminal states and records audit evidence.

- Source: `src/features/rto/rto.service.ts`
- Test: `rto.service.spec.ts`
- Failure mode: releasing stock twice or closing a case with mismatched units.

## 196. Terminal-state retry barrier

Webhook, polling, payment, return, refund, and RTO workers all need a terminal
state barrier: a late event may be retained as evidence, but must not regress a
completed state or repeat financial/inventory side effects.

- Source: shipping, refunds, returns, and RTO service/processor paths
- Tests: lifecycle and recovery specs across those features
- Failure mode: late provider events undoing a completed fulfillment outcome.

## Evidence boundary

Focused tests provide source and unit evidence for these patterns. Real courier
credentials, live webhooks, queue load fairness, and end-to-end delivery still
require `PROVIDER`, `LOCAL`, or `STAGING` evidence in the audit matrix.
