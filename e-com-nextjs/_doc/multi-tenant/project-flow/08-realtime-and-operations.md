# 8. Realtime And Operations

## Socket Authentication

Socket.IO is a separate transport from REST. The client first requests a
short-lived ticket:

```text
authenticated client -> POST /api/v1/socket-auth/ticket
  -> AuthGuard
  -> tenant context organizationId
  -> SocketAuthService signs ticket

guest storefront -> POST /api/v1/socket-auth/guest-ticket
  -> validate guest ID
  -> tenant context organizationId
  -> signed guest ticket
```

The Socket.IO gateway verifies the ticket at connection time. It stores the
principal on the socket and derives organization-scoped rooms. The ticket is
not a database connection credential.

## Socket Connection Flow

1. Socket.IO accepts a connection on the configured socket port/path.
2. `SocketAuthService.authenticateSocket()` verifies the short-lived ticket.
3. The gateway rejects unauthenticated or malformed connections.
4. User/org data is attached to socket data.
5. Personal, role, conversation, family, and task rooms are prefixed/scoped by
   organization where the user is tenant-bound.
6. Redis tracks presence and the Redis Socket.IO adapter broadcasts across
   application workers.
7. Chat and notification events verify membership/tenant scope before emit.
8. Disconnect removes presence/page-view state and emits safe online status.

## Chat Flow

```text
REST conversation/message route
  -> tenant membership + participant authorization
  -> persist conversation/message in tenant DB
  -> enqueue participant notification
  -> ChatNotificationProcessor
  -> tenant fan-out
  -> SocketGateway.emitToUser/emitToRoom
```

The old `messageReadStatus` path is a known legacy boundary and should not be
copied into new Prisma features.

## Operations Health

`OperationsHealthService` combines evidence from:

- control/tenant database probe;
- Redis probe;
- BullMQ queue counts;
- payment provider readiness;
- courier readiness;
- recent commerce aggregates;
- backup and restore evidence;
- process memory/uptime/request metrics.

Health output distinguishes `HEALTHY`, `DEGRADED`, and `UNAVAILABLE`. It is an
operational signal, not proof that every tenant is healthy or that the platform
has passed capacity testing.

## Logging And Audit

The logging interceptor records method/path/status/latency/correlation and safe
principal information. Structured services add domain events such as payment,
queue, provisioning, retention, and tenant-fan-out outcomes.

Audit is separate from logs:

- logs explain runtime execution and troubleshooting;
- tenant audit records explain business mutations and actor intent;
- platform audit records explain control-plane operations.

Sensitive data, tokens, passwords, decrypted credentials, and provider secrets
must not appear in either.

## Scalability Meaning In This Project

The backend is designed for horizontal application instances, but capacity is
bounded by PostgreSQL pools, Redis, queue concurrency, provider rate limits,
and tenant workload. A safe scaling plan therefore requires:

1. bounded tenant database clients and idle eviction;
2. tenant-aware cache and queue keys;
3. bounded pagination, report windows, imports, and worker batches;
4. idempotent retries and provider circuit breakers;
5. noisy-neighbor metrics and queue-age visibility;
6. load tests for hot tenants and many simultaneous tenants;
7. failure tests for control-plane, Redis, tenant DB, courier, and payment
   outages.

