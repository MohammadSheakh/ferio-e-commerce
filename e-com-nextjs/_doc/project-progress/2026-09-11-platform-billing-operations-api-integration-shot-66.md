# Platform Billing and Operations API Integration Shot 66

Date: 2026-09-11
Scope: platform-admin billing screen and automation boundary review.

## Finding and fix

The billing screen previously read invoices and payment attempts only. It now
calls the safe operator endpoints through the existing authenticated platform
BFF:

- `GET /platform/billing/billing-configured`
- `POST /platform/billing/invoices`
- `POST /platform/billing/invoices/:id/pay`
- `POST /platform/billing/payment-attempts/recover`
- `GET /platform/billing/invoices/:id/receipt`

The UI validates invoice input shape, shows provider readiness without leaking
credentials, requires an operator reason for invoice/payment actions, and never
marks an invoice paid from browser state. Payment sessions may open the
server-returned gateway URL; final payment state remains callback/service-owned.

The following remain intentionally non-browser paths:

- `GET/POST /platform/billing/callback` is gateway-owned.
- `POST /platform/maintenance/retention-sweep` is scheduler/operations-owned.
- `POST /platform/operations/backup-evidence` is trusted backup-automation-owned.

## Validation

- `ferio-platform-admin`: `pnpm api:check` passed.
- `ferio-platform-admin`: `pnpm exec tsc --noEmit` passed.
- `ferio-platform-admin`: `pnpm lint` passed with no warnings or errors.
- `ferio-platform-admin`: `pnpm build` passed and generated the billing route.

## Boundary

This closes source-level browser integration for safe platform billing actions.
It does not claim live provider credentials, gateway callback delivery,
financial idempotency under retries, backup/restore proof, retention execution,
live permissions, or production acceptance.
