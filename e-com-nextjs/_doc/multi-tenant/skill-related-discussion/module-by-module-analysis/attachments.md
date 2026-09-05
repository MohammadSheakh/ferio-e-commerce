# Attachments Module

## Scope

File attachment upload, entity lookup, and deletion through the legacy
attachment service.

## Architecture Score

**42%**. The controller surface is small, but this module remains Mongoose/
legacy-oriented while the active commerce architecture is Prisma and
tenant-database based.

## Routes

| Route | Score | Review |
|---|---:|---|
| `POST /attachments/upload` | 45% | Upload pipeline exists, but request typing, file validation, tenant ownership, and storage policy need a Prisma-era boundary review. |
| `GET /attachments/by-entity` | 40% | Entity lookup can become an authorization/data-leak boundary unless entity ownership is enforced in the service. |
| `DELETE /attachments/:id` | 40% | Requires explicit tenant ownership, storage deletion idempotency, and audit coverage. |

## Strengths

- Dedicated attachment controller/service boundary.
- Storage concerns are separated from most commerce services.
- The repository contains file-upload pipeline documentation.

## Confirmed Issues

- Legacy Mongoose patterns remain active in the module.
- Attachment files are excluded from the strict TypeScript path.
- File upload and Cloudinary boundaries still contain weak dynamic types.
- The module is not aligned with the tenant Prisma architecture described in
  the skill.

## Tasks

1. Define a Prisma attachment model and tenant-scoped repository.
2. Enforce MIME, extension, size, content-signature, and filename policy.
3. Make entity ownership checks mandatory before read/delete.
4. Add private-object and orphan-cleanup workflows with idempotent retries.
5. Add integration tests for cross-tenant access and failed uploads.
