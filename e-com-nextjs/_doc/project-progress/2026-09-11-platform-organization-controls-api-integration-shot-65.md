# Platform Organization Controls API Integration Shot 65

Date: 2026-09-11
Scope: platform-admin organization detail control-plane mutations.

## Finding and fix

The NestJS platform API exposed five organization-scoped operations with no
frontend caller in `ferio-platform-admin`:

- `POST /platform/organizations/:id/subscription/trial`
- `PATCH /platform/organizations/:id/subscription/status`
- `PUT /platform/organizations/:id/entitlement-overrides/:featureKey`
- `DELETE /platform/organizations/:id/entitlement-overrides/:featureKey`
- `POST /platform/organizations/:id/domain-cache/invalidate`

Added `SubscriptionActions` to the organization detail screen. It calls those
routes through `/api/platform/[...path]` with their actual HTTP methods, shows
server failure messages, validates feature-key/reason/limit/future-expiry
shape before submission, and requires confirmation before revoking an
entitlement override. It does not expose provider secrets or claim success
before the server response.

## Validation

- `ferio-platform-admin`: `pnpm api:check` passed.
- `ferio-platform-admin`: `pnpm exec tsc --noEmit` passed.
- `ferio-platform-admin`: `pnpm lint` passed with no warnings or errors.
- `ferio-platform-admin`: `pnpm build` passed and generated the organization
  detail route successfully.

## Boundary

This closes source-level platform-console integration for these operations. It
does not claim live platform permission testing, subscription-provider billing,
DNS/TLS verification, provisioned tenant host routing, browser two-host
isolation, or production acceptance.
