# Pattern Curriculum Audit Scope

## Brutally honest status

The pattern documents were not generated after reading every file in
`ferio-nest-prisma`. That would be a separate exhaustive audit of hundreds of
source, generated, migration, script, and test files. The curriculum was
created from:

- the existing source-backed `project-flow` audit;
- backend directory/module inventories;
- representative controllers, services, processors, guards, database,
  tenancy, Redis, queue, platform, and frontend BFF files;
- focused unit/integration test inventories;
- the PRD and implementation checklist;
- verified source anchors listed in the study-codebase documents.

This is enough to identify recurring architecture patterns, but it is not
proof that every individual feature follows each pattern consistently.

## Inventory snapshot

The current backend inventory contains approximately:

```text
453 TypeScript files under src/
52 TypeScript files under libs/
51 controller files
77 service files
39 module files
8 processor files
6 queue files
156 test files under src/ and test/
```

The inventory is evidence of scope, not evidence that each file has been
manually reviewed.

## Directly checked pattern families

- application bootstrap and global HTTP behavior;
- tenant host resolution, context, database manager, and membership guards;
- platform Prisma and tenant Prisma boundaries;
- provisioning, closure, migrations, backup/export scripts;
- catalog, cart, checkout, order, wallet, payment, shipping, returns,
  refunds, reports, settings, chat, and socket examples;
- Redis/queue library boundaries and representative processors;
- frontend customer-web BFF/SSR tenant forwarding;
- focused isolation, idempotency, queue, socket, and integration test names.

## Not exhaustively checked yet

- every feature controller/service branch;
- every DTO and OpenAPI response schema;
- every generated Prisma artifact and migration SQL;
- every provider adapter credential/error path;
- every frontend consumer of every backend endpoint;
- full runtime behavior for every module and external provider;
- managed production infrastructure and real-business pilot evidence.

## How to turn this into a full audit

For each feature directory, apply the worksheet in
`../study-codebase/08-module-by-module-source-index.md` and record:

```text
source files reviewed
routes and DTOs
tenant/platform boundary
pagination/list behavior
auth/ownership checks
transaction/idempotency behavior
queues/providers/realtime behavior
focused tests run
PRD/checklist claims confirmed or corrected
```

Do not mark a pattern as fully verified until its implementation and focused
test have both been read. Keep runtime/provider evidence separate from source
inspection.
