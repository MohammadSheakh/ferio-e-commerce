# Release 1 Tenant Threat Model

## Assets

- Tenant commerce data and customer identity.
- Control-plane organization, subscription, domain, and encrypted registry data.
- Payment, wallet, COD, refund, and settlement records.
- Provider credentials, storage objects, queue payloads, socket rooms, and
  operational logs.

## Trust Boundaries

1. Browser/mobile client to API: all tenant selectors are untrusted.
2. Proxy to API: forwarded host is accepted only under the trusted-proxy
   policy.
3. Platform control plane to tenant database: registry resolution is trusted;
   tenant DB credentials are encrypted at rest and absent from request context.
4. Queue/provider callback to worker: payloads are untrusted until validated
   and re-resolved through the control plane or a verified callback binding.
5. Platform operator to tenant data: explicit support grant, scope, expiry,
   revocation, and audit are required.

## Primary Threats And Controls

| Threat | Release 1 control/evidence |
| --- | --- |
| Host or forwarded-host spoofing | Trusted proxy policy, normalized host resolver, active-domain registry, fail-closed unknown-domain tests |
| Tenant A session replayed on tenant B | Membership and tenant-local identity checks plus cross-tenant session tests |
| Client chooses another tenant DB | Host-only resolution, immutable context, registry-only connection manager, no legacy fallback |
| IDOR with a shared identifier | Tenant-local queries and overlapping-ID isolation suites for high-risk modules |
| Platform privilege escalation | Separate platform realm/permissions and explicit support-access workflow |
| Callback forgery or replay | Provider validation, callback binding, state transition constraint, idempotent duplicate handling |
| Cross-tenant cache/queue/socket/object collision | Namespaced keys, organization-labelled envelopes/rooms, storage prefix authorization |
| Resource exhaustion | Bounded pools, clients, fan-out, queue concurrency, pagination, timeouts, and failure isolation |
| Secret leakage | Encrypted registry credentials, redacted structured logging, stable external error codes |

## Residual Risk

Managed backup/restore, production ingress/TLS, secret management, provider
configuration, sustained load, chaos/failover, and frontend SSR/BFF E2E tests
remain deployment and validation work. This document does not claim those
controls are complete.
