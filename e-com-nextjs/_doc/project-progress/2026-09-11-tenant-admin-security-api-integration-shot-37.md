# Tenant-admin security and staff API integration shot 37

Date: 2026-09-11

## Scope

Audited tenant-admin staff access, commerce settings, two-factor security,
delivery personnel/zones, and shipping callers against the admin BFF, NestJS
controllers/DTOs, and API documentation.

## Findings and changes

- Staff access, commerce settings, delivery personnel/zones, and shipping
  callers use the tenant-admin BFF routes and preserve structured error/finally
  handling for their mutations.
- Confirmed the two-factor routes and payloads match the backend admin 2FA
  contract: status read, setup, confirm, and disable.
- Fixed the security page's missing exception boundaries. Initial status,
  setup, confirmation, and disable requests now report network or malformed
  responses and always release the busy state.
- No endpoint, method, payload, or response-envelope mismatch was found in
  this scope.

## Verification

- `pnpm api:check` passed.
- `pnpm exec tsc --noEmit` passed.
- `pnpm lint` passed; existing warnings remain in unrelated chat/map/image and
  hook-dependency files.

## Remaining runtime proof

Live tenant-host forwarding, admin permission denial, 2FA challenge/expiry,
staff session revocation, shipping-provider callbacks, queue health, and
delivery-personnel authorization still require runtime evidence. No mobile or
Redis code was changed.
