# ADR-0004 — Platform Identity vs Tenant Membership

**Status:** ACCEPTED (cross-tenant staff-login policy owner-blocked) · **Date:** 2026-08-24

## Context

Three distinct identity populations now exist:

1. **Platform users** — Ferio operators (organization management, plans, provisioning, support). Must never implicitly inherit tenant commerce access.
2. **Tenant staff** — belong to one or more businesses with a role per business (owner, order ops, warehouse…).
3. **Tenant customers / riders** — commerce actors scoped to a single business.

Putting `role` on a global user row conflates these and creates privilege-mixing bugs (the exact class of bug the single-tenant codebase already hit with legacy roles like `commonAdmin`).

## Decision

- **Control plane** owns `PlatformUser`, platform roles/permissions, `OrganizationMember` (platform identity ↔ organization, with role OWNER/STAFF and status), and `SupportAccessGrant`.
- **Tenant databases** own their local `User`, `Customer`, `DeliveryPersonnel` rows exactly as today. Tenant RBAC continues to work unchanged inside each database.
- Authorization is evaluated in layers: platform realm guard → tenant resolution (ADR-0002) → membership check (control plane) → tenant-local RBAC (existing guards) → entitlements (ADR-0006).
- A valid session is bound to the resolved organization for the request: tokens/sessions minted under tenant A's admin origin are rejected against tenant B even if the underlying email matches.
- Same-email across businesses: allowed at the platform layer via separate memberships; whether one login can *switch* between member businesses without re-authentication is an owner-blocked product decision. Default until decided: re-authentication per business origin (cookie scoping by host makes this natural).
- Customer accounts are **tenant-local initially**; cross-tenant SSO/shared customer identity is deferred (owner-blocked).
- Support access is never implicit: it is a reason-bound, time-bound, auditable, revocable grant.

## Consequences

**Positive:** existing tenant auth/RBAC code migrates forward untouched; privilege escalation between realms requires compromising two independent systems; audit trails can name both actor and membership.
**Negative/obligations:** two user directories must be kept conceptually separate in reviews; staff invitation flows gain a control-plane step; tests must cover "valid token, wrong tenant" rejection.

## Alternatives rejected

- Single global user table with `role` + `tenantId`: recreates the conflation we are escaping.
- Duplicating staff identities per tenant with no platform linkage: loses "one person manages multiple businesses" and makes offboarding unenforceable.
