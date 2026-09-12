# API Integration Verification — Tenant Admin Transactional Messaging (Shot 56)

**Date:** 2026-09-11  
**Scope:** Tenant-admin message outbox, templates, provider readiness, policy, queue health, and retry  
**Excluded:** `ferio-mobile-expo54/`; Redis configuration and implementation

## Finding

The messages dashboard already integrated outbox listing/search, templates,
queue health, failed-message retry, and template updates. The documented policy
GET/PATCH and provider GET endpoints had no BFF routes or dedicated browser
callers. Provider PATCH accepts credentials and must not become a browser secret
form.

## Fix

- Added authenticated BFF GET/PATCH routes for messaging policy.
- Added authenticated BFF GET route for non-secret provider configuration state.
- Added explicit policy controls for enabled state, channel priority, and
  fallback-on-definitive-failure.
- Added provider readiness cards showing channel, provider, enabled state, and
  credential-key count without exposing credential values.
- Kept provider credential PATCH operator-controlled and documented the boundary.

## Verification

- Confirmed message outbox, templates, queue health, and retry callers remain
  mapped to the NestJS controller.
- Confirmed policy payload matches `UpdateMessagingPolicyDto`.
- Confirmed provider GET response contains metadata only; no secret values are
  returned to the browser.
- `pnpm api:check` in `ferio-admin-dashboard/ferio-admin`: pass.
- `pnpm exec tsc --noEmit` in `ferio-admin-dashboard/ferio-admin`: pass.
- `pnpm lint` in `ferio-admin-dashboard/ferio-admin`: pass with existing warnings.
- `git diff --check`: pass.

Live permissions, provider credentials/delivery, queue availability, policy
correctness, browser behavior, and cross-tenant isolation remain runtime gates.
Redis was not changed.
