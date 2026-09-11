# Customer Account and Value API Integration Shot 07

**Date:** 2026-09-11
**Scope:** Customer account, notifications, wallet, warranty, reviews, product requests, services, and store-location API integration.
**Explicit exclusions:** `ferio-mobile-expo54/` and Redis implementation/configuration.

## Finding and fix

The wallet top-up BFF passed request headers from `forwardedHeaders()` into
`customerSessionFetch()`. Those headers are a `Headers` instance, but the
session transport spread `init.headers` as a plain object. As a result, the
wallet `Idempotency-Key` could be dropped before reaching the backend, which
would undermine the wallet service's duplicate-top-up protection.

`customerSessionFetch()` now normalizes every `HeadersInit` form with
`new Headers()`, preserves caller headers such as idempotency and correlation
IDs, and then sets server-owned Authorization and tenant-forwarding headers.

The account API documentation also incorrectly listed profile and address
updates as PATCH. The NestJS controllers and BFF routes use PUT, so the docs
were corrected to PUT/DELETE.

## Validation boundary

The remaining account/value API route mappings match the backend controllers
at source level. TypeScript/lint validation is required after this shared
transport change. Browser cookie/session behavior, real duplicate-submit
replays, upload storage/malware handling, service-provider behavior, and live
tenant isolation remain separate runtime gates.
