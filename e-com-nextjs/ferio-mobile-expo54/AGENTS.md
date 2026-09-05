# Mobile Instructions

Apply the [shared frontend context](../../.codex/frontend-context.md) and [SaaS PRD](../_doc/multi-tenant/Ferio-Commerce-SaaS-PRD-v2.1.md).

- This app is the mobile customer experience; do not duplicate platform-admin or tenant-admin capabilities.
- Keep authentication, tenant/store routing, cart, checkout, orders, notifications, and offline/error behavior explicit.
- Use typed API contracts and keep mobile behavior aligned with the backend rather than inventing client-only business rules.
- Protect tokens and sensitive data using platform-appropriate secure storage.
- Verify Android, iOS, and web behavior when a shared Expo path changes.
