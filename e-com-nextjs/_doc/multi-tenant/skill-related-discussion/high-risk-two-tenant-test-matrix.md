# High-Risk Two-Tenant Test Matrix

This matrix is the executable evidence index for the MT-7 gate requiring
two-tenant coverage across financial, identity, and real-time boundaries.
It lists only tests that are present in the repository and identifies the
assertion each suite makes. Redis tests are referenced as existing evidence;
this work did not modify Redis code, configuration, or tests.

## Financial Boundaries

| Boundary | Evidence | What the test proves |
| --- | --- | --- |
| Cart, checkout, COD order, confirmation, and stock reservation | `test/two-tenant-vertical.integration-spec.ts` | The same logical flow runs for two tenant databases and overlapping order/customer identifiers cannot cross the resolved tenant boundary. |
| Payment callback routing | `src/features/commerce-payments/tests/commerce-payments.controller.spec.ts` | A callback signed with another tenant secret is rejected before routing or payment processing. |
| Payment state and retry context | `src/features/commerce-payments/tests/commerce-payments.service.spec.ts` | The same order identifier returns different tenant-local payment state from the resolved tenant database; provider configuration revocation remains tenant-local. |
| Wallet balances and ledger | `src/features/wallet/tests/wallet.tenant-isolation.spec.ts` and `test/wallet-isolation.integration-spec.ts` | Identical customer IDs resolve to separate wallet balances, ledger rows, and idempotency state. |
| Returns, refunds, and RTO | `src/features/returns/tests/returns.tenant-isolation.spec.ts`, `src/features/refunds/tests/refunds.tenant-isolation.spec.ts`, `src/features/rto/tests/rto.tenant-isolation.spec.ts` | Identical lookup identifiers are read only from the current tenant database. |
| Courier settlements | `src/features/settlements/tests/settlements.tenant-isolation.spec.ts` | Identical settlement queries remain tenant-local. |
| Reconciliation findings and payment alerts | `src/features/reconciliation/tests/reconciliation.service.spec.ts` | Identical finding identifiers return tenant-specific records through the resolved tenant database. |
| Customer/order/report ownership | `src/features/customer-account/tests/customer-account.tenant-isolation.spec.ts`, `src/features/customers/tests/customers.tenant-isolation.spec.ts`, `src/features/order/tests/order-reference.tenant-isolation.spec.ts`, `src/features/reports/tests/reports.tenant-isolation.spec.ts` | Overlapping user, customer, order, and report identifiers cannot select another tenant's records. |

## Identity Boundaries

| Boundary | Evidence | What the test proves |
| --- | --- | --- |
| Access-token tenant binding | `src/core/security/auth-tenant-binding.spec.ts` | A valid token issued for another organization is rejected and is not attached to a request. |
| Session membership and platform separation | `src/tenancy/tests/tenant-membership.guard.spec.ts` | Cross-tenant session replay and implicit platform-to-tenant access are rejected. |
| Authentication refresh-token tenant binding | `src/features/authentication/auth/tests/auth.service.spec.ts` | A refresh token issued for another tenant cannot be used in the resolved tenant context. |
| Customer and rider identity records | `src/features/customer-account/tests/customer-account.tenant-isolation.spec.ts`, `src/features/delivery-personnel/tests/delivery-personnel.tenant-isolation.spec.ts` | Identical user IDs resolve and mutate only the current tenant's customer or rider records. |

## Real-Time and Background Boundaries

| Boundary | Evidence | What the test proves |
| --- | --- | --- |
| WebSocket connection, notifications, and chat relay | `test/socket-isolation.integration-spec.ts` | Four live clients across two organizations receive only their own rooms/events; a foreign guest join is denied. |
| Socket room state and family membership | `src/features/socket-gateway/tests/socket-room.service.spec.ts`, `src/features/socket-gateway/tests/socket-auth.service.spec.ts` | Identical conversation/task/user IDs produce disjoint organization rooms and presence namespaces. |
| Rider live-map writes and events | `src/features/delivery-personnel/tests/delivery-personnel.tenant-isolation.spec.ts` | Identical rider IDs write location history in separate tenant databases and emit through the ambient tenant room. |
| Tenant fan-out and retention workers | `src/tenancy/tests/tenant-fanout.service.spec.ts`, `src/tenancy/tests/retention-sweep.service.spec.ts` | Worker envelopes preserve organization identity, bound concurrency, isolate failures, and skip inactive/closed organizations before client acquisition. |
| Transactional messaging worker boundary | `src/features/transactional-messaging/tests/transactional-messaging.service.spec.ts`, `src/features/transactional-messaging/tests/transactional-message-dispatcher.spec.ts` | Outbox and dispatch operations resolve through the tenant database and preserve tenant context for retries. |

## Validation

Focused unit evidence for the newly completed financial slices:

```text
pnpm exec jest --runInBand \
  src/features/reconciliation/tests/reconciliation.service.spec.ts \
  src/features/commerce-payments/tests/commerce-payments.service.spec.ts
```

Result: 2 suites passed, 23 tests passed.

The live PostgreSQL and WebSocket integration suites remain separate CI
evidence and require their disposable infrastructure. This matrix does not
claim million-user capacity, provider-side credential invalidation, or
production deployment readiness.
