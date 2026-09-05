# Application Bootstrap And Shared Infrastructure

## Scope

Nest bootstrap, global validation/security/interceptors, common guards,
exception filters, Prisma/Redis/database libraries, queues, notification
adapters, and legacy shared infrastructure.

## Architecture Score

**74%**. Bootstrap security and operational middleware are strong, but the
repository still contains duplicate Redis/queue/database paths and excluded
legacy code that weakens the uniform architecture.

## Routes And Runtime Boundaries

| Boundary | Score | Review |
|---|---:|---|
| Global `api/v1` prefix and validation | 86% | Whitelist, forbid-non-whitelisted, transformation, and versioning are good. |
| Global exception/logging/response interceptors | 80% | Structured error/logging contract exists; keep sensitive data sanitized. |
| Auth/role/permission/rate-limit guards | 78% | Good layered model; require consistent typed principals and route coverage tests. |
| Prisma/Redis providers | 76% | Pool limits/timeouts and Redis failure behavior improved; duplicate providers remain. |
| BullMQ/notification workers | 68% | Tenant envelopes and active-processor ownership need uniform enforcement. |
| Legacy Mongoose/file-upload paths | 45% | Isolated but still present; they must not silently become default architecture. |

## Tasks

1. Remove or quarantine duplicate legacy providers and queue processors.
2. Add CI gates for generated clients, strict typecheck, lint, and OpenAPI drift.
3. Gradually remove TypeScript exclusions by boundary and eliminate explicit
   `any` from active application code.
4. Add dependency-graph checks so tenant modules cannot omit `TenancyModule`.
