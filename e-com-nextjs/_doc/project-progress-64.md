# Ferio Project Progress 64

**Checkpoint date:** August 20, 2026
**Milestone:** Slice 9 Web BFF error-envelope normalization
**Status:** Direct-fetch Customer and Admin BFF routes normalized and type-safe; remaining Admin helper catch bodies require migration.

## Delivered

### Shared BFF contracts

- Added Customer and Admin helpers for forwarding incoming correlation IDs to Backend requests.
- Added consistent local BFF failures with `success`, `message`, `code`, and optional `correlationId`.
- Added safe Backend proxy handling that preserves upstream status, machine code, and support reference.
- Retained successful upstream payload structures to avoid breaking existing consumers.

### Customer Web

- Normalized direct account registration, verification resend, logout, guest chat, rider/delivery, product request, service booking, store-location, and order-tracking routes.
- Replaced anonymous 500 responses with appropriate validation, authentication, upstream, or service-unavailable codes.
- Forward incoming browser correlation IDs through all direct Backend fetch routes.

### Admin Web

- Normalized direct product-request and chat proxy routes.
- Fixed duplicated `/api/v1` segments in Admin product-request proxy URLs.
- Added explicit missing-session failures instead of forwarding `Bearer undefined`.
- Normalized Admin login validation, upstream-session, and service-unavailable failures.
- Forward incoming correlation IDs through Admin login, logout, chat, and product-request calls.

## Validation

| Project | Check | Result |
| --- | --- | --- |
| Customer Web | TypeScript `--noEmit` | Passed |
| Admin Web | TypeScript `--noEmit` | Passed |
| Customer and Admin Web | Direct-fetch correlation helper audit | Passed; no bypass found |

## Remaining

- Replace ad hoc `{ message }` catch bodies in Admin routes that already use `adminApi` with the shared coded error response.
- Normalize local authentication-required responses in Customer session-backed BFF routes.
- Add a Web route-handler test harness when the frontend projects adopt a test runner.
