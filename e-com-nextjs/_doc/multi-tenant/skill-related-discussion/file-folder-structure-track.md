# Feature File/Folder Structure Tracking

This document tracks the structural review and refactoring of
`ferio-nest-prisma/src/features`. It is intentionally separate from runtime
architecture findings: a folder can be structurally sound while its service
logic still has security or scalability work.

## Standard Used

The target is a NestJS bounded-context layout:

```text
feature-name/
  feature-name.module.ts
  controllers/                 # only when there are multiple controllers
  services/                    # only when there are multiple cohesive services
  dto/
  adapters/ | gateways/ | processors/ | policies/ | utils/
  *.controller.ts               # acceptable for a small feature
  *.service.ts                  # acceptable for a small feature
  tests/                        # feature-level unit/integration tests
```

Important decisions:

- Colocated `*.spec.ts` files are technically valid NestJS practice, but this
  repository uses feature-local `tests/` directories as its chosen convention.
  Tests remain beside their owning feature without mixing production files and
  test files in the same folder.
- Multiple controllers/services inside one module are industry-standard when
  they represent one bounded context or explicit subdomains. The module
  should be split only when subdomains have different dependencies, release
  cadence, persistence boundaries, or scaling/authorization policies.
- DTOs, adapters, processors, and utilities deserve folders when a feature has
  enough of them to obscure the domain root. A small module should not be
  over-engineered with empty folders.
- Runtime source directories must not contain historical completion reports or
  architecture notes. Those documents belong under `_doc/`.
- Directory names should be kebab-case. Existing Prisma model names and
  exported TypeScript class names do not need to change solely for folder
  naming.

## Refactor Status

| Feature | Structure score | Current assessment | Action |
|---|---:|---|---|
| attachments | 62% | Strategy folder is good; legacy boundary and runtime documentation were mixed. | Documentation moved; plan Prisma/tenant migration. |
| audit | 86% | Focused module with controller/service/dto and utility. | Keep layout; add tests as needed. |
| authentication | 88% | Strong submodule layout: auth, email, OAuth, OTP, and 2FA. | Keep layout; do not flatten. |
| cart | 82% | Small cohesive module; colocated DTO/spec is appropriate. | Keep layout. |
| catalog | 84% | Small root plus DTO and split public/admin controller classes. | Keep layout. |
| chatting | 78% | Correct subdomain folders; message-read-status is legacy/Mongoose-shaped. | Rename/replace legacy subdomain in a dedicated migration. |
| checkout | 84% | DTO and utility folders are justified. | Keep layout. |
| commerce-payments | 90% | Excellent adapters/gateways/dto/processor separation. | Keep layout. |
| customer-account | 82% | Small cohesive module. | Keep layout. |
| customer-notifications | 80% | Small cohesive module with service spec. | Keep layout. |
| customers | 78% | Small module with utility separation. | Keep layout. |
| delivery-personnel | 78% | Small cohesive module; DTO is large but domain-specific. | Keep layout; split DTO only if it grows. |
| operations-health | 82% | Focused controller/service/module. | Keep layout. |
| order | 86% | Root service plus focused DTO/utilities and tests. | Keep layout; service decomposition is a logic task, not folder cosmetics. |
| product-content | 74% | Small module; root DTO is acceptable. | Keep layout; improve code quality separately. |
| product-request | 80% | Small module with DTO and controller spec. | Keep layout. |
| purchase-activity | 78% | Utility and DTO separation are appropriate. | Keep layout. |
| reconciliation | 88% | Queue/processor/service/util/dto separation is strong. | Keep layout. |
| refunds | 80% | Small module with DTO and service/controller tests. | Keep layout. |
| reports | 84% | DTO/util/service/controller separation is appropriate. | Keep layout. |
| returns | 84% | DTO/util/service/controller separation is appropriate. | Keep layout. |
| rto | 78% | Small domain with DTO/util/service/controller. | Keep layout. |
| service-booking | 76% | Small cohesive module; DTO is root-level but not excessive. | Keep layout. |
| settings | 90% | Controllers, services, DTOs, constants, and tests are cleanly grouped. | Keep layout; this is a reference pattern. |
| settlements | 88% | Parser/import/services/dto separation is good. | Keep layout. |
| shipping | 88% | Adapters, DTO, processors, queues, and services are separated. | Keep layout; avoid moving files without dependency benefit. |
| socket.gateway | 80% | Services and guards are separated; dotted folder name is inconsistent. | Rename to `socket-gateway` only with a complete import migration. |
| staff-access | 82% | Small cohesive module. | Keep layout. |
| storage | 80% | Strategy/controller/module are appropriately small. | Keep layout. |
| store-locations | 80% | DTO and service/controller split are appropriate. | Keep layout. |
| storefront-analytics | 82% | Utility and test separation is appropriate. | Keep layout. |
| transactional-messaging | 90% | Adapters, DTO, dispatcher, processor, queue, utility, service are well separated. | Keep layout; use as reference. |
| user-management | 76% | Valid submodule boundary, but camelCase folder names and historical docs are inconsistent. | Documentation moved; normalize names in a controlled migration. |
| wallet | 82% | Small cohesive module with DTO and service test. | Keep layout. |
| warranty | 84% | DTO/util/controller/service tests are well grouped. | Keep layout. |

## Completed Refactor

- Moved historical attachment notes from `src/features/attachments` to
  `_doc/multi-tenant/skill-related-discussion/module-notes/attachments/`.
- Moved historical user-management submodule notes to
  `_doc/multi-tenant/skill-related-discussion/module-notes/user-management/`.
- No runtime imports were changed by those moves.
- Standardized the high-complexity runtime boundaries for `purchase-activity`,
  `reconciliation`, `refunds`, `reports`, `returns`, `settlements`, `shipping`,
  and `socket.gateway`.
- Standardized the remaining mixed-role boundaries for `audit`,
  `commerce-payments`, `transactional-messaging`, `chatting`, and `storage`.
  Controllers, application services, processors, queues, gateways, adapters,
  utilities, and storage strategies now have explicit ownership folders.
- Moved domain utilities for `customers`, `order`, `storefront-analytics`, and
  `warranty` into dedicated `utils/` folders, and moved the socket gateway
  README into module documentation.
- Added explicit `controllers/`, `services/`, `processors/`, `queues/`,
  `utils/`, and `gateway/` folders where those roles exist. Small cohesive
  features intentionally keep a flat runtime root instead of receiving empty
  ceremonial folders.
- Moved feature-level tests for the remaining modules into local `tests/`
  folders, including audit, cart, catalog, commerce-payments,
  customer-account, customer-notifications, customers, operations-health,
  order, product-request, rto, staff-access, store-locations,
  storefront-analytics, transactional-messaging, wallet, and warranty.
- Updated all affected application, test, and integration-test imports.
- Moved the remaining historical `user-management` completion report out of
  `src/features` into the module documentation area.
- Verification for this refactor: `pnpm exec tsc --noEmit` passed;
  `pnpm test -- --runInBand` passed with 90 suites and 408 tests.

## Controlled Follow-Up Refactors

### Wave 1: Naming

- Rename `userProfile` to `user-profile`, `userDevices` to `user-devices`,
  `oauthAccount` to `oauth-account`, and `messageReadStatus` to
  `message-read-status`.
- Rename `socket.gateway` to `socket-gateway` only after updating application,
  chat, legacy-worker, integration-test, and TypeScript exclusion imports.
- Use one atomic change per rename with typecheck and full test verification.

### Wave 2: Legacy Boundaries

- Replace the Mongoose-shaped `messageReadStatus` implementation with the
  active Prisma tenant model or explicitly isolate it under a legacy adapter.
- Remove stale schema comments and historical migration claims from runtime
  module files.
- Keep attachments behind a named storage/attachment port until its Prisma
  migration is complete.

### Wave 3: Oversized Logic, Not Cosmetic Folders

- Decompose `OrderService`, `ShippingService`, `SocketGateway`, and
  `AuthService` by responsibility only when tests and dependency direction
  support the move.
- Prefer `query`, `command`, `policy`, and `integration` services over arbitrary
  `service-1`/`service-2` splits.
- Preserve module-level public APIs and exports during decomposition.

## Verification Required Per Refactor

For every rename or extraction:

1. Search all source, tests, scripts, and documentation references.
2. Update imports using the project aliases where available.
3. Run `pnpm exec tsc --noEmit`.
4. Run the narrow module tests, then `pnpm test -- --runInBand`.
5. Run `git diff --check` and record the commit here.

## Current Status

- Initial inventory: complete for all feature directories.
- Structure assessment: complete for 35 feature modules.
- Safe documentation relocation: complete.
- Feature role/test layout migration: complete for the current safe wave.
- Mixed-role module migration: complete for audit, payments, messaging,
  chatting, and storage.
- Utility/documentation cleanup: complete for the remaining utility-heavy
  feature modules.
- Nested test cleanup: complete for authentication, chatting, checkout,
  settings, and user-management. Tests now live in submodule-local `tests/`
  folders without flattening those bounded contexts.
- Naming migration: pending dedicated implementation wave.
- Large-service decomposition: pending behavior-first design work.

## Refactor Boundary

This wave intentionally did not flatten the established submodule structures
under authentication, chatting, checkout, or user-management. Those folders
already express bounded subdomains and should be renamed or decomposed only as
an atomic dependency migration, not as a cosmetic bulk move.
