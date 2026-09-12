# Platform lifecycle API integration shot 33

Date: 2026-09-11

## Scope

Audited platform-admin organization creation/provisioning/status/closure,
migration rollout controls, support-access revoke, plan/billing navigation, and
the catch-all platform BFF against the NestJS platform controllers and DTOs.

## Findings and changes

- Endpoint paths and lifecycle payloads matched the platform controllers,
  including closure attestations, provisioning, status reasons, migration
  canary/concurrency/failure fields, and support revoke.
- Fixed mutation failure handling in organization actions, organization
  creation, migration start/pause/resume, and support revoke. Network and
  malformed responses now produce visible bounded feedback and release working
  controls instead of leaving the operator UI stuck or reloading silently.
- The existing catch-all BFF continues to keep platform credentials in
  httpOnly server cookies and supports GET/POST/PATCH/PUT/DELETE through the
  refresh-aware platform session client.

## Verification

- Platform-admin `pnpm api:check`: passed.
- Platform-admin `pnpm exec tsc --noEmit`: passed.
- Platform-admin `pnpm lint`: passed with no warnings.

## Remaining runtime proof

Live operator authorization, refresh rotation, idempotency/replay behavior,
provisioning/closure execution, migration canary safety, support TTL/scope,
managed infrastructure, and production acceptance remain runtime gates. Mobile
and Redis code were not changed.
