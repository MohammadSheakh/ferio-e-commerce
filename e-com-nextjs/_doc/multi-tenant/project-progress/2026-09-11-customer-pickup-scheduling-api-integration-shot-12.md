# Customer Pickup Scheduling API Integration Shot 12

**Date:** 2026-09-11
**Scope:** Authenticated customer store-pickup scheduling from account order history.
**Explicit exclusions:** `ferio-mobile-expo54/` and Redis implementation/configuration.

## Change

The backend already exposed `PATCH /orders/:id/store-pickup/schedule`, but the
customer web app had no BFF route or browser caller. The integration now:

1. Includes `deliveryMethod`, `storePickupStatus`, `pickupScheduledAt`,
   `preferredPickupSlot`, and `customerPickupNotes` in the tenant-local
   account-order projection.
2. Adds an authenticated BFF route at
   `/api/orders/:id/store-pickup/schedule` using `customerSessionFetch`.
3. Adds a store-pickup-only form to account order history for date/time, slot,
   and customer notes.
4. Reloads the account projection after a successful schedule update.

The NestJS service remains authoritative for order ownership, delivery method,
tenant database selection, and audit recording.

## Validation boundary

Customer-web TypeScript/lint and NestJS application typecheck/lint passed.
Broad NestJS `tsc --noEmit` remains blocked by existing unrelated test typing
errors in malware-scanner and local-postgres-provisioner specs. Runtime order
ownership denial, schedule conflicts, timezone behavior, OTP handover, and
live tenant-host isolation still require E2E evidence.
