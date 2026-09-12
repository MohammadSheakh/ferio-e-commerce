# Patterns 57-68: NestJS Repetition Patterns

These patterns explain why many features look structurally similar. The
repetition is intentional: it keeps HTTP coordination, domain behavior,
database access, and tests separated.

## 57. Root module composition

Template: `src/app.module.ts`. Study imports, middleware configuration,
exclusions, and provider ownership. A module list is also an architectural
map of the runtime.

## 58. Controller orchestration

Template: representative `*.controller.ts` files under catalog, cart, order,
settings, and platform. Controllers bind routes, DTOs, decorators, and service
calls. They should not contain database construction or long business rules.

## 59. Injectable service boundary

Template: `@Injectable()` services under `src/features/`. Study constructor
dependencies, public application methods, private domain helpers, and how
services expose stable errors rather than framework details.

## 60. DTO query object

Template: feature `dto/` directories and settings/message query DTOs. Query
filters, pagination, sorting, and optional values should be validated and
normalized once at the boundary before the service composes Prisma options.

## 61. Guard/decorator metadata

Template: `src/core/security/permissions.guard.ts`, platform decorators, and
tenant membership guards. Metadata declares policy; guards evaluate the
principal and resolved tenant. A decorator alone is not enforcement.

## 62. Count-and-data parallel query

Template: catalog, orders, audit, and customer list methods. Run count and page
queries with the same filter scope, then return a stable pagination envelope.
Study whether the database client supports safe parallelism and whether count
cost is acceptable for the endpoint.

## 63. Bounded bulk command

Template: platform billing recovery, shipping polling, retention, and report
batch code. Bulk work uses an explicit maximum, records per-item failure, and
avoids one unbounded request or transaction.

## 64. Transaction callback service

Template: order, wallet, returns, refunds, and settlement services. The service
opens a transaction, passes a transaction client to domain operations, commits
only after all invariants pass, and keeps external network calls outside when
required.

## 65. Provider registry lookup

Template: courier router, message adapter registry, and payment gateways.
Resolve a provider from supported configuration and capability, not from a
client-supplied class name or arbitrary URL. Unsupported providers fail with a
stable contract.

## 66. Test double and contract fixture

Template: focused `*.spec.ts` files under tenancy, payment, shipping, and
platform services. Study how Prisma, Redis, queues, and providers are mocked,
which contract is asserted, and which integration test is still needed.

## 67. Architecture rule as executable check

Template: `scripts/architecture-boundary-check.mjs`,
`check-tenant-context-boundaries.mjs`, and migration validators. A rule that
matters for tenant safety should be executable in CI rather than left only in a
document.

## 68. Configuration validation at startup

Template: `src/config/config.module.ts`, Docker entrypoint, and environment
validation scripts. Study required variables, safe defaults, production
fail-closed behavior, secret presence, and how local profiles differ from
production profiles.

## How to recognize the template

When a new module appears, ask:

```text
module -> controller -> DTO -> guards/decorators -> service
       -> tenant/platform DB boundary -> provider/queue
       -> audit/metrics -> focused tests -> integration evidence
```

This is the reusable backbone. Feature-specific complexity belongs in the
service, state machine, adapter, or processor; it should not silently change
the trust boundary.
