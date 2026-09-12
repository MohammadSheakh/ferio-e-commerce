# Platform plans and billing API integration shot 34

Date: 2026-09-11

## Scope

Audited platform-admin plan catalog create/update, subscriptions, invoices,
payment attempts, and the platform BFF against the active platform DTOs,
controllers, and API documentation.

## Findings and changes

- Plan create/update routes and payloads match the backend DTOs. Added client
  numeric bounds and integer steps matching the backend `amountMinor` limit.
- Fixed plan create/update network and malformed-response handling so mutation
  controls are released and an actionable failure is shown.
- Billing and subscription pages already use the refresh-aware server
  `platformApi`, but swallowed control-plane failures and rendered empty
  tables. Removed the silent catches so the existing platform error boundary
  surfaces an outage instead of implying that no data exists.
- No endpoint, method, query, or response-envelope mismatch was found in this
  scope.

## Verification

- `pnpm api:check` passed.
- `pnpm exec tsc --noEmit` passed.
- `pnpm lint` passed with no warnings or errors.

## Remaining runtime proof

Live plan authorization, billing-provider callbacks, invoice/payment data,
refresh rotation, and production billing readiness remain runtime gates. No
mobile or Redis code was changed.
