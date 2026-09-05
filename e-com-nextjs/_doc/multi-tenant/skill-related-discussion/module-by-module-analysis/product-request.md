# Product Request Module

## Scope

Public product-request submission and admin list/status/delete operations.

## Architecture Score

**70%**. The public/admin split, rate limiting, DTOs, and typed Prisma filters
are reasonable; anti-abuse, pagination, and audit depth need improvement.

## Routes

| Route | Score | Review |
|---|---:|---|
| `POST /product-requests` | 72% | Public request is simple and rate-limited; protect spam and sensitive contact data. |
| `GET /product-requests` | 72% | Admin query is tenant-scoped and paginated; validate status enum at DTO boundary. |
| `PATCH /product-requests/:id/status` | 70% | Status transition and audit should be explicit. |
| `DELETE /product-requests/:id` | 70% | Admin delete should be audited or soft-deleted according to retention policy. |

## Tasks

1. Add status transition policy and audit events.
2. Add anti-spam quotas and duplicate request handling.
3. Add indexes for status/createdAt and search strategy for large tenants.
