# API Integration Verification — Tenant Admin Review Banners (Shot 55)

**Date:** 2026-09-11  
**Scope:** Product review-banner list, update, and delete integration  
**Excluded:** `ferio-mobile-expo54/`; Redis configuration and implementation

## Finding

The NestJS product-content controller and wildcard admin BFF already supported
banner GET, POST, PATCH, and DELETE operations, but the reviews screen only
exposed banner creation. Operators could not inspect, reorder, deactivate, or
remove existing banners from the frontend.

## Fix

- Added product-scoped banner loading by explicit product ID.
- Added inline editing for image URL, alt text, sort order, and active state.
- Added server-backed save and confirmed delete actions.
- Reloaded the product banner list after create, update, and delete so the UI
  reflects authoritative tenant data.
- Updated verification status and fix tracking.

## Verification

- Confirmed the existing wildcard BFF forwards banner GET/POST/PATCH/DELETE to
  the corresponding NestJS controller paths.
- Confirmed payload fields match `CreateReviewBannerDto` and
  `UpdateReviewBannerDto`.
- `pnpm api:check` in `ferio-admin-dashboard/ferio-admin`: pass.
- `pnpm exec tsc --noEmit` in `ferio-admin-dashboard/ferio-admin`: pass.
- `pnpm lint` in `ferio-admin-dashboard/ferio-admin`: pass with existing warnings.
- `git diff --check`: pass.

Live permissions, tenant forwarding, browser behavior, content moderation
correctness, and cross-tenant isolation remain runtime gates. Redis was not
changed.
