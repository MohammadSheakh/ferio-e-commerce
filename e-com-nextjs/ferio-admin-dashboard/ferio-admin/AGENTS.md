# Tenant Admin Instructions

Apply the [shared frontend context](../../../.codex/frontend-context.md) and [design language](../../_doc/design-language.md).

- This app is the authenticated admin surface for one tenant organization.
- Use tenant-admin authentication and tenant-scoped API routes; never call platform-admin APIs for convenience.
- The active organization must come from the trusted backend/session context, not an arbitrary browser-selected database.
- Respect subscription entitlements, staff roles, ownership checks, and tenant-scoped error handling.
- Keep catalog, inventory, orders, customers, shipping, reports, settings, and billing flows consistent with the backend contract.
