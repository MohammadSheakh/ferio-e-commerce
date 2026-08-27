# Ferio Project Progress 78

**Checkpoint date:** August 21, 2026  
**Milestone:** Durable storefront commerce analytics  
**Status:** Slice 2 product-view, search, filter, and add-to-cart analytics events are complete for Customer Web.

## Delivered

### Durable event ingestion

- Added `POST /api/v1/storefront-analytics/events` with a versioned, server-timestamped event contract.
- Added PostgreSQL persistence and indexes for event type, product, visitor, and occurrence time.
- Added client-generated event IDs with unique storage so safe retries do not duplicate events.
- Added public-route sliding-window rate limiting and strict DTO validation.
- Validates product views and add-to-cart events against active products and variants.

### Customer Web instrumentation

- Records one product-view event per product per browser session.
- Records applied search and supported filter combinations once per browser session.
- Records add-to-cart only after the server cart mutation succeeds, including Buy Now.
- Added a Customer Web BFF route so the browser does not call the backend origin directly.
- Replaced the remaining socket tracker dependency on `crypto.randomUUID()` with a secure-context-compatible UUID fallback.

### Privacy boundary

- Stores an HMAC-pseudonymous visitor identifier rather than the browser identifier.
- Does not persist IP address, user agent, referrer, customer contact data, or URL query strings.
- Allowlists supported filter keys and scalar values.
- Normalizes search terms, caps their length, and redacts likely email addresses and phone numbers.
- Supports a dedicated production `ANALYTICS_HASH_SECRET`, with the access-token secret retained only as a compatibility fallback.

## Validation

| Project | Check | Result |
| --- | --- | --- |
| Backend | Storefront analytics sanitization suite | Passed; 3 tests |
| Backend | Prisma schema composition and client generation | Passed; 42 schema files |
| Backend | Complete NestJS application and library build | Passed |
| Customer Web | Next.js production build and type validation | Passed; 61 routes generated |

## Deployment

- Apply migration `20260821220000_storefront_analytics_events` before serving the new endpoint.
- Set a strong, independent `ANALYTICS_HASH_SECRET` in production secret management.
