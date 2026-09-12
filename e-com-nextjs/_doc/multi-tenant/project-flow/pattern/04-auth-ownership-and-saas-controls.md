# Patterns 16-20: Auth, Ownership, And SaaS Controls

## 16. Authentication realm separation

Templates: feature authentication and `src/platform/guards/platform-auth.guard.ts`.
Platform operators and tenant users are different security realms. A valid
token in one realm is not automatically valid for the other.

## 17. Membership binding

Template: `src/tenancy/guards/tenant-membership.guard.ts` and its tests. A
principal must belong to the organization resolved from the host before a
protected tenant operation proceeds.

## 18. Permission decorator and guard

Templates: `src/core/security/permissions.guard.ts` and platform controller
decorators. Read role, permission, route metadata, denial codes, and test
coverage separately; UI visibility is not authorization.

## 19. Plan/entitlement gate

Templates: `src/platform/services/entitlements.service.ts`, plan-gate tests,
and tenant plan controller. Entitlements are evaluated server-side and return a
stable denial contract regardless of frontend state.

## 20. Suspended-commerce write guard

Templates: `src/tenancy/guards/tenant-suspension.guard.ts` and
`commerce-write-guard.util.ts`. Study the deliberate distinction between
allowed reads/browse policy and denied commerce mutations.

### Critical current checkpoint

The current provisioning flow creates a control-plane owner membership but does
not create a tenant-plane user. The secure owner invitation/activation flow is
therefore a release gate; direct database fixture insertion is not an
acceptable substitute.

### Senior questions

- Which identity proves the tenant, and which proves the actor?
- Where is entitlement enforced if the frontend is bypassed?
- What can a suspended tenant still read, if anything?
