# Customer Value-Added API Integration Shot 61

**Date:** 2026-09-11
**Scope:** Customer warranty claims/evidence, service booking, product requests, and product reviews

## Findings

- Warranty history, delivered-order item verification, multipart evidence upload, and claim creation are wired through the authenticated catch-all warranty BFF. The browser sends `images` as multipart form data and the BFF does not overwrite the multipart content type, preserving the boundary required by NestJS.
- Service catalog reads and booking submission match `GET /services`, `GET /services/:slug`, and `POST /services/bookings/request`. The backend intentionally exposes these public routes and applies tenant resolution plus service-booking enablement/lead-time rules server-side.
- Product-content reads and review submission match the active routes. Review submission is authenticated through `customerSessionFetch` and the backend owns moderation state; no guest review path was added.
- Product requests are public but optionally associate the authenticated customer. The BFF previously read only the access cookie directly, so an expired access token could bypass refresh and lose account association. It now uses `customerSessionFetch` first, then falls back to the public request with forwarded tenant headers for guests.

## Changes

- Updated `ferio-customer-web/app/api/product-requests/route.ts` to centralize authenticated session refresh, Authorization, correlation, and host forwarding while preserving guest submissions.
- Documented the optional-auth boundary in `api-documentation/customer-storefront/value-added-services.md`.
- Added the result to `10-sep-2026-BHO-backend-fix-track.md`.

## Validation

- `pnpm api:check` in `ferio-customer-web`
- `pnpm exec tsc --noEmit` in `ferio-customer-web`
- `pnpm lint` in `ferio-customer-web`
- `git diff --check`

Lint retains the repository's existing image optimization warnings. Live browser/session-refresh behavior, multipart storage/content validation, booking race behavior, moderation authorization, and cross-tenant runtime proof remain open gates.

Redis was not changed.
