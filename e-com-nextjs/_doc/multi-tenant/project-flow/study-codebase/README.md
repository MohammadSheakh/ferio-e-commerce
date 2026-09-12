# Backend Codebase Study Guide

## Short answer

The existing `project-flow` documents are enough to understand the product
flows, release boundaries, and the intended multi-tenant architecture. They
are not enough by themselves to study the backend implementation deeply.

This folder supplies the missing source-oriented layer: file paths, reading
order, database boundaries, feature-to-test anchors, runtime commands, and
known implementation gaps. Read it together with the parent flow documents,
the PRD, the implementation checklist, and the API documentation.

## Recommended order

1. `01-backend-map.md`
2. `02-request-and-tenant-lifecycle.md`
3. `03-data-prisma-and-provisioning.md`
4. `04-auth-rbac-and-owner-bootstrap.md`
5. `05-commerce-feature-reading-order.md`
6. `06-redis-queues-realtime-and-operations.md`
7. `07-study-and-verification-checklist.md`
8. `08-module-by-module-source-index.md`
9. `09-backend-study-lab.md`

## How to use each chapter

For every claim, open the referenced source file, then its focused unit test,
then the matching API document. A flow document is an explanation; the
controller, service, test, and operational evidence are the authority for
current behavior.

## Scope and status

- Scope is the backend and its web-facing contracts. The mobile app is outside
  this study set, matching the existing audit scope.
- The source-backed flow audit is tracked in `../PROJECT-FLOW-AUDIT-STATUS.md`.
- The current staging evidence does not prove production hosting, managed
  PITR, real-business pilot execution, or final security acceptance.
- The current provisioning path creates a control-plane owner membership but
  does not create a tenant-plane `User` row. The resulting owner activation
  gap is documented in `04-auth-rbac-and-owner-bootstrap.md`.

## Useful roots

```text
ferio-nest-prisma/src/       application source
ferio-nest-prisma/libs/      shared database, Redis, queue, common libraries
ferio-nest-prisma/prisma/    tenant and platform schemas/migrations
ferio-nest-prisma/test/      integration and end-to-end tests
_doc/multi-tenant/api-documentation/  endpoint contract and verification notes
```
