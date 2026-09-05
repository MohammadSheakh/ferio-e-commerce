# 5 September 2026 Brutal Honest Opinion Fix Track

This tracker records remediation work for
`5-sep-2026-brutal-honest-opinion.md`. The opinion document is an audit record
and must not be modified to make the project look better.

## Status Legend

- `TODO`: identified, not yet implemented
- `IN PROGRESS`: currently being implemented
- `DONE`: implemented and verified
- `BLOCKED`: requires an explicit product, infrastructure, or migration decision

## Remediation Queue

| ID | Finding | Status | Evidence / next action |
| --- | --- | --- | --- |
| BO-01 | Backend typecheck excludes production runtime modules and `any` remains widespread. | IN PROGRESS | Added an entrypoint-based application typecheck and CI gate; remaining `any` reduction and isolated legacy trees are still open. |
| BO-02 | ESLint permits explicit and unsafe `any` usage. | IN PROGRESS | Established the active-code baseline inventory; removed unsafe `any` payloads, query filters, transaction casts, and status maps from delivery personnel. Remaining active gateway/cart/authentication `any` usages and the lint baseline are still open. |
| BO-03 | Docker compose is development-oriented and unsafe as a production deployment. | IN PROGRESS | Added a production overlay that requires credentials, enables tenancy, removes host exposure, and enables Redis authentication; TLS/ingress remains deployment-owned. |
| BO-04 | Legacy database/Mongoose fallback paths remain in active backend modules. | IN PROGRESS | Production configuration now fails fast unless tenancy is enabled; remaining legacy fallback inventory and removal/isolation are still open. |
| BO-05 | API contracts are generated per app but not centrally enforced. | IN PROGRESS | Added non-mutating `api:check` commands and CI checks for all three web clients; backend OpenAPI export drift and a shared client remain open. |
| BO-06 | CI lacks lint, frontend/mobile tests, migration verification, image smoke tests, and strict dependency failure policy. | IN PROGRESS | Backend `lint` is now read-only; mobile typecheck and dependency audit are now covered, while lint, frontend tests, migrations, image smoke tests, and strict audit failures remain open. |
| BO-07 | Scalability claims lack load, saturation, failure, and multi-instance evidence. | TODO | Define capacity targets and add repeatable HTTP, WebSocket, queue, and database benchmarks. |
| BO-08 | Frontend has repeated fetch/parsing patterns, manual types, `any`, and no coherent test strategy. | TODO | Establish shared typed request/error utilities and test critical auth, tenancy, checkout, and admin flows. |
| BO-09 | Agent and skill rules are better documented than enforced by tooling. | TODO | Convert the highest-value rules into lint, type, architecture, contract, secret, and CI checks. |

## Change Log

### 2026-09-05

- Created this tracker; the audit document remains unchanged.
- Started BO-06 by separating read-only lint validation from auto-formatting.
- Read-only backend lint currently fails with 1,566 errors and 21,563 warnings, including project-service parsing failures for integration tests. A CI gate was not kept in a known-red state.
- Added `ferio-nest-prisma/tsconfig.application.json` as a full runtime typecheck boundary; the existing default build/typecheck configuration remains unchanged until newly exposed modules are repaired.
- Refined the application typecheck to follow `src/main.ts`, `src/app.module.ts`, and `src/platform/platform.module.ts`; it passes without compiling orphaned legacy duplicate trees.
- Added `pnpm typecheck:application` and its CI gate. This verifies the active dependency graph but does not close the explicit-`any` work.
- Replaced global request `any` types with `UserPayload` and typed upload metadata; tightened shared guards, user decorator, logging interceptor, exception filter, and upload interceptor. The application typecheck remains green.
- Replaced Firebase credential and notification payload `any` boundaries with `admin.ServiceAccount`, required credential checks, `unknown` error handling, and `Record<string, string>` message data. The application typecheck remains green.
- Added `docker-compose.production.yml` as a hardened overlay; local compose remains unchanged for development. The overlay requires production credentials, sets `NODE_ENV=production` and `TENANCY_ENABLED=true`, removes host ports for infrastructure/apps, and configures Redis authentication.
- Rendered the production overlay with temporary validation values and verified Compose produces no `published` host ports, production mode is enabled, tenancy is enabled, and Redis uses `--requirepass`. TLS, ingress, image pinning, resource limits, and orchestration remain open.
- Prevented production Compose from inheriting local platform superadmin bootstrap credentials; first operator provisioning must be deliberate and secret-managed.
- Added non-mutating `api:check` scripts to customer web, tenant admin, and platform admin; CI now compares generated OpenAPI client schemas with committed artifacts without modifying the worktree.
- Regenerated all three committed client schemas from `ferio-nest-prisma/openapi.json`; the drift included storage routes, two-factor DTO fields, and email format metadata. Customer web and tenant-admin `api:check` pass locally; platform-admin dependency installation is still missing locally but its generated artifact matches the verified output hash.
- Added mobile to the CI dependency-audit matrix and added a dedicated Expo TypeScript-check job using the existing `pnpm typecheck` script.
- Added fail-fast environment validation: `NODE_ENV=production` now requires `TENANCY_ENABLED=true`, preventing accidental startup in legacy single-tenant mode. Legacy fallback code still requires module-by-module removal or isolation.
- Extended production validation to require the platform database URL, platform JWT secret, platform credential-encryption key, and Redis password. Development/test defaults remain available only outside production.
- Added `TenantDbService.getOrLegacy()` as the single fail-closed policy for legacy database access. Migrated catalog, customer-account, and refunds services to use it, with regression coverage for legacy mode, missing tenant context, and resolved tenant context. Remaining feature services still need migration.
- Continued BO-04 migration across checkout, order, and cart services. These commerce paths now use the centralized fail-closed tenant database policy instead of silently falling back when tenancy is enabled.
- Migrated authentication and user-management database selection to the same centralized policy, removing duplicate environment-based fallback logic from the identity boundary.
- Migrated the remaining 22 feature-service inline fallbacks to `TenantDbService.getOrLegacy()`. Updated the storefront analytics unit test double to match the production boundary; the affected feature suite must remain green before this batch is committed.
- Removed equivalent fallback variants from chatting, staff access, OAuth, two-factor, courier routing, settlement imports, operations health, and transactional messaging. These paths now share the same fail-closed tenancy policy.
- Removed the remaining identity and WebSocket service fallback variants from user profiles, devices, socket authentication, and socket rooms. Queue-specific tenancy guards remain separate because they resolve organization identity from job payloads rather than request context.
- Audited Mongoose usage for BO-04: the remaining Mongoose models and Mongo database module are legacy/orphaned compatibility code, excluded from the active application typecheck and not imported by `AppModule`; the only `MongooseModule.forRootAsync` registration is commented out. They remain cleanup debt, but are not an active production database path.
- Started BO-02 explicit-`any` reduction in delivery personnel: replaced update payloads, filters, transaction clients, and shipment status maps with domain/Prisma types. Application typecheck passes; the module currently has no unit tests, which remains a testing gap.
- Removed all explicit `any` usage from cart saved-cart serialization and reorder/import paths by introducing typed Prisma-derived records, result contracts, and `unknown` error handling. Cart tests pass (7 tests) and the application typecheck remains green.
