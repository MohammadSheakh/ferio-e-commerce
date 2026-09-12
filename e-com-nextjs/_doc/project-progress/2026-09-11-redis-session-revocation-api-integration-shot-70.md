# Redis Session Revocation API Integration - Shot 70

Date: 2026-09-11

## Scope

This shot verifies the Redis-backed refresh-token revocation path used by
customer and tenant-admin authentication. It does not claim live browser or
cross-tenant host isolation evidence.

## Evidence

- Focused NestJS authentication tests passed: 2 suites and 9 tests.
- The service tests cover tenant-mismatch refresh rejection when tenancy is
  enabled and rejection of a refresh token whose blacklist entry is present.
- The project Redis instance on `127.0.0.1:6380` returned `PONG`.
- A disposable blacklist key round trip returned `SET=OK`,
  `GET=blacklisted`, `TTL=30`, `DEL=1`, and an empty post-delete read.
- The full local Compose backend is configured to use the project Redis
  service internally; the host port `6380` is temporary because another Redis
  process owns host port `6379`.

## Assessment

The source-level Redis revocation dependency and refresh rejection behavior are
working in the local environment. Remaining evidence gates are live cookie
rotation, provisioned two-tenant browser isolation, Cloudflare/tunnel header
behavior, queue/retention operations, and production-grade Redis recovery and
monitoring.
