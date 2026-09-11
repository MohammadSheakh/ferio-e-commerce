# Platform System Health and Feature Flags API Integration Shot 67

Date: 2026-09-11
Scope: platform-admin system health, feature flags, and fleet-operation callers.

## Finding and fix

The platform API exposed two safe operational surfaces with no frontend screen:

- `GET /platform/system-health`
- `GET /platform/feature-flags`
- `PUT /platform/feature-flags/:key`

Added `app/system-health` to render runtime status, control-plane DB probe,
queue availability/counts, tenant database counts, backup posture, support
grants, and active alerts. Added `app/feature-flags` with audited flag listing
and note-bearing enabled/disabled updates through the platform session BFF.

The existing `app/database-health` and `app/migrations` pages were rechecked:
database-health calls the fleet drift GET, while migrations call list/start and
pause/resume with the correct POST methods. Retention sweep and backup-evidence
writes remain automation-owned and were not turned into browser forms.

## Validation

- `ferio-platform-admin`: `pnpm api:check` passed.
- `ferio-platform-admin`: `pnpm exec tsc --noEmit` passed.
- `ferio-platform-admin`: `pnpm lint` passed with no warnings or errors.
- `ferio-platform-admin`: `pnpm build` passed; 17 routes generated.

## Boundary

This closes source-level platform-console integration for these operations. It
does not claim live platform permissions, Redis/BullMQ queue fairness,
backup/restore evidence, retention execution, or production acceptance.
