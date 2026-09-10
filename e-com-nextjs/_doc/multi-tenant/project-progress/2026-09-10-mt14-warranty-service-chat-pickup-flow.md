# MT-14 Warranty, Service, Chat, and Pickup Flow Evidence

## Reconciled control

The internal-alpha feature-flow control is covered by a focused regression run:

- `service-booking.service.spec.ts` covers tenant-local service discovery,
  service publish, booking creation, and admin status transition.
- `warranty.service.spec.ts` and `warranty.controller.spec.ts` cover the
  warranty queue and guarded claim entry points.
- `conversation.service.spec.ts` covers chat participant authorization and
  organization-scoped direct-conversation locking.
- `store-locations.tenant-isolation.spec.ts` proves pickup-store reads use only
  the resolved tenant database.

Validation result: **5 suites passed, 9 tests passed**.

This closes automated internal-alpha coverage only. It does not claim a
real-business pilot, courier/provider execution, live customer messaging, or
production pickup operations; those remain pilot and deployment controls.
