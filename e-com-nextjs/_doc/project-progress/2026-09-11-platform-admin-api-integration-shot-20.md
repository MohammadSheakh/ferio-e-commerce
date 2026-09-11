# Platform Admin API Integration Shot 20

Date: 2026-09-11

## Scope

Audited platform-admin organizations/lifecycle, migrations, support access,
plans/subscriptions, billing, database health, and domain health callers
against the platform BFF, controllers, and DTOs.

## Findings

- The platform catch-all BFF forwards GET, POST, PATCH, PUT, and DELETE while
  retaining the platform token server-side.
- Organization actions matched the controller paths, but the closure dialog
  accepted a three-character reason even though `InitiateClosureDto` requires
  at least ten characters. The UI now applies the backend minimum.
- Migration UI sends `concurrencyLimit` and `failureThreshold`; the old docs
  called the first field `batchSize` and omitted the pause threshold.
- Support access accepts `ttlMinutes` and optional `scope`, not an absolute
  `expiresAt` field. Finalize closure requires both retention and export
  attestations. Trial creation requires `planKey`.
- Billing readiness is exposed at `/platform/billing/billing-configured`.
  Plan create/update payloads use flat billing fields (`billingInterval` and
  `amountMinor`), matching the editor and DTO.

## Changes

- Fixed the platform closure reason validation in `org-actions.tsx`.
- Corrected platform organization, migration, support-access, plan, billing,
  and subscription documentation.

## Boundary notes

This is source-level contract evidence. It does not claim browser E2E, live
platform authorization, managed database failover, provider billing delivery,
tenant provisioning success, destructive closure execution, or production
operational acceptance.
