# Customer Rider API Integration Shot 08

**Date:** 2026-09-11
**Scope:** Rider apply, login/session, profile, assigned orders, status transitions, online status, and GPS location.
**Explicit exclusions:** `ferio-mobile-expo54/` and Redis implementation/configuration.

## Finding and fix

The rider portal stores its access token only in the `ferio_rider_token`
httpOnly cookie. The status-update BFF route incorrectly looked for an
`Authorization` header on the browser request, while the portal sends no such
header. Logged-in riders could load their profile/orders and toggle duty/GPS,
but every order status transition was rejected as unauthenticated.

The status route now reads the same httpOnly cookie through
`riderTokenFromCookie()` before forwarding to the tenant-scoped NestJS
delivery-personnel controller. The rider documentation now includes all
protected action endpoints and records the cookie boundary.

## Validation boundary

Customer web TypeScript and lint validation is required after this route fix.
This source-level correction does not prove live rider authorization, GPS
accuracy/retention, transition race handling, staff COD confirmation, or
cross-tenant isolation under real host ingress.
