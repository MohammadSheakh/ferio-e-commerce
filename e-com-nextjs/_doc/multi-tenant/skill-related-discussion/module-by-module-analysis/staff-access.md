# Staff Access Module

## Scope

Invitation acceptance, reset completion, admin staff listing, invitations,
deactivation, access updates, and reset flows.

## Architecture Score

**78%**. Security-sensitive flows are separated and admin routes use role,
permission, and tenant membership guards.

## Routes

| Route | Score | Review |
|---|---:|---|
| `POST /staff-access/accept-invitation` | 78% | Token expiry, single-use, tenant binding, and enumeration resistance required. |
| `POST /staff-access/complete-reset` | 78% | Must invalidate sessions and enforce password policy. |
| `GET /admin/staff` | 80% | Protected tenant-admin listing; bound pagination and safe fields required. |
| `POST /admin/staff/invitations` | 80% | Good actor boundary; idempotency and email delivery retry need tests. |
| `PATCH /admin/staff/:id/deactivate` | 80% | Must revoke sessions and audit the actor/reason. |
| `PATCH /admin/staff/:id/access` | 78% | Permission changes require reauthorization/session invalidation policy. |
| `POST /admin/staff/:id/reset` | 78% | Step-up authorization and safe reset workflow required. |

## Tasks

1. Add invitation/reset replay and cross-tenant tests.
2. Define session invalidation semantics for every access mutation.
3. Add audit events with previous/new roles and permissions.
