# Tenant Admin Bootstrap Blocker - Shot 29

Date: 2026-09-12

## Probe

Attempted the supported tenant-admin catalog path for both disposable active
hosts using the repository's seeded admin credentials, without printing or
persisting an access token:

| Host | Admin login | Catalog mutation |
| --- | --- | --- |
| `stage-alpha-20260912.sheakh.qzz.io` | `401 AUTHENTICATION_REQUIRED` | Not attempted |
| `stage-beta-20260912.sheakh.qzz.io` | `401 AUTHENTICATION_REQUIRED` | Not attempted |

Read-only inspection confirmed both provisioned tenant databases contain zero
`User` rows. The platform organization records contain owner memberships, but
the provisioning state machine's `ATTACH_OWNER_MEMBERSHIP` step only records
that membership as already created during organization creation; it does not
bootstrap a tenant-plane user, invitation, password setup, or owner token.

The tenant baseline intentionally seeds business-neutral settings and no fake
commerce data. That behavior is correct, but the current release flow has no
supported bridge from the control-plane owner membership to a first tenant
admin session.

## Assessment

This is a genuine onboarding/provisioning blocker, not a reason to insert users
or catalog rows directly into PostgreSQL. Direct SQL would bypass password
hashing, membership binding, invitation expiry, audit, and tenant authorization.

The missing contract must be designed explicitly. Safe options are:

1. Provision an expiring, single-use owner invitation tied to the organization
   and owner email, then expose an owner activation endpoint that creates the
   tenant `User` and membership-bound admin session.
2. Use a platform-managed identity linked to the existing
   `OrganizationMember`, with a first-login/tenant-session exchange and no
   tenant-local password duplication.

The implementation must define email delivery/retry, token hashing and
single-use consumption, expiry, cross-tenant binding, audit events, password
reset, and how the tenant-admin login guard maps the activated identity to the
organization.

## Gate status

Public DNS, tunnel routing, active domains, distinct tenant databases, SSR,
host-aware store-config BFF, and dynamic edge-cache behavior are proven.
Authenticated tenant-admin catalog creation, customer carts/orders, cookie
rotation, and WebSocket ticket isolation remain blocked until owner bootstrap
is available through a supported API.

## Next action

Resolve the owner-bootstrap contract with the PRD/ADR owners, then implement
the smallest audited activation flow before continuing browser commerce
isolation. Do not use the temporary seed credentials or direct database edits
as a substitute for this production onboarding path.
