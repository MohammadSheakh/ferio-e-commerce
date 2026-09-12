# Customer value-added API integration shot 29

Date: 2026-09-11

## Scope

Audited customer warranty claims, service bookings, product requests,
purchase/activity support surfaces, and live chat BFF/socket flows against the
NestJS controllers, DTOs, and active browser callers.

## Findings and changes

- Confirmed warranty claim history, delivered-order verification, multipart
  evidence upload, and claim creation use the authenticated warranty BFF and
  match the backend routes and file limits.
- Fixed service booking UX integration: the form now matches all booking DTO
  fields and limits, prevents duplicate submissions while a request is in
  flight, safely handles malformed/network responses, and always releases its
  submit state.
- Fixed product-request and feedback validation to respect the backend's
  `productName` maximum of 500 characters before sending the request.
- Confirmed chat socket tickets, authenticated/guest message history, and
  Socket.IO message persistence are routed through the tenant-bound backend
  contract. No route mismatch was found.
- Updated value-added API documentation with the booking fields and strict
  product-request limit.

## Verification

- Customer `pnpm api:check`: passed.
- Customer `pnpm exec tsc --noEmit`: passed.
- Customer `pnpm lint`: passed with the repository's existing
  `@next/next/no-img-element` warnings only.

## Remaining runtime proof

Live service-provider configuration, booking race/idempotency behavior,
multipart malware/storage behavior, chat WebSocket room isolation, and
cross-tenant host testing still require the local Docker/application stack or
staging tunnel. No Redis or mobile code was changed.
