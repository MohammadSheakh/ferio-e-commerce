# Rider online-state API integration shot 41

Date: 2026-09-11

## Scope

Audited customer-web rider login, profile, assigned orders, status updates,
online/offline duty state, GPS location, and public rider application flows
against the NestJS controller/service, tenant schema, BFF routes, and rider
API documentation.

## Findings and changes

- Found a real PRD FR-RIDER-005 mismatch: the frontend submitted
  `{ isOnline }`, but the tenant schema had no persisted duty-state field and
  the service only updated `lastLocationAt` when enabling duty.
- Added tenant-local `DeliveryPersonnel.isOnline` with default `false` and an
  expand migration.
- Updated `toggleOnlineStatus` to persist the requested state; enabling duty
  still refreshes `lastLocationAt`.
- Hydrated the rider portal's duty indicator from the server profile instead of
  defaulting to online, and documented the authoritative response contract.
- Added regression coverage for both offline and online writes.

## Verification

- Migration validation, integrity, and compatibility checks passed.
- NestJS application typecheck passed.
- Focused rider isolation/state suite passed: 1 suite, 3 tests.
- Customer-web API check and TypeScript passed.
- Customer-web lint passed with existing image warnings and the existing Node
  engine warning.

## Remaining runtime proof

Live rider login, tenant-host forwarding, duty-state persistence against a real
database, assignment authorization, status-transition races, GPS delivery,
and browser PWA evidence remain open. No mobile or Redis code was changed.
