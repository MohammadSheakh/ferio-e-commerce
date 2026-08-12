# Ferio Project Progress 13

**Checkpoint date:** August 11, 2026  
**Milestone:** Release 1 — Settings and operational controls  
**Status:** Typed commerce settings are implemented, audited, and enforced in the current COD order path

## Delivered

### Backend configuration domain

- Added a typed singleton `CommerceSettings` model and migration for store identity, legal name, support contacts, BDT currency, IANA timezone, order prefix, return-window default, payment availability, and policy links.
- Kept the legacy static-content settings model separate so operational configuration is validated rather than stored as untyped content.
- Added authenticated admin read/update APIs and a public safe configuration API that never exposes provider credentials or internal audit data.
- Added validation and normalization for Bangladesh support phone numbers, email casing, absolute policy URLs, order prefixes, return-window bounds, and IANA timezones.
- Rejected prepaid activation until a payment provider is approved and configured instead of presenting an unavailable payment path as active.

### Operational enforcement

- Applied the configured order prefix and currency to future order creation.
- Enforced global COD availability during both checkout preview and transactional order creation.
- Preserved product-level COD restrictions and the existing configurable COD verification policy.
- Recorded every commerce-settings update in the append-only audit ledger with actor and safe before/after values inside the same database transaction.

### Admin Web

- Added `/dashboard/settings`, its authenticated BFF route, and sidebar navigation.
- Added restrained sections for identity, contacts, commerce defaults, checkout availability, return-window default, and policy links following the Ferio design language.
- Linked operational settings to the existing COD and delivery configuration surfaces.
- Added `CommerceSettings` to the audit-history entity filter.

## Validation

| Project | Check | Result |
| --- | --- | --- |
| Backend | Prisma schema generation | Passed; 32 schema fragments |
| Backend | Prisma schema validation | Passed |
| Backend | Unit tests | Passed; 9 suites and 31 tests |
| Backend | Production build | Passed |
| Admin Web | Production build | Passed; settings page and BFF route generated |

## Still Open

- Migrations have not been applied to a disposable or live PostgreSQL database.
- The exact return policy remains product-owner blocked; the setting stores an approved default when available but does not invent category exceptions.
- Prepaid activation remains blocked until the first payment provider is selected and configured securely.
- Notification-template configuration and approved provider dispatch remain incomplete.
- Delivered, cancelled, returned, RTO, collection, refund, and settlement reporting remain incomplete.
- Customer Web has a public safe configuration endpoint available, but support and policy pages have not yet consumed it.

## Recommended Next Work

1. Build a truthful delivered-outcome reporting foundation without calculating unapproved contribution metrics.
2. Add customer support and policy surfaces backed by the public safe configuration endpoint.
3. Apply migrations to disposable PostgreSQL and verify settings, audit, checkout, and order behavior against the database.
4. Resume payment, courier, and messaging adapters only after provider decisions and credentials are available.
