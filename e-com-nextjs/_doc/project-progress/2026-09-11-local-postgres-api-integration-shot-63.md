# Local PostgreSQL API Integration Shot 63

**Date:** 2026-09-11
**Scope:** Disposable backend/database runtime evidence supporting the API integration audit

## Runtime setup

- Started only `postgres` from `docker-compose.infra.yml`.
- PostgreSQL image: `postgres:16`.
- Host port: `5433`.
- Redis was not started or changed by the setup.
- The configured disposable database was `ferio_test_runner`; no development or platform database was used by the integration runner.

## Result

Ran `pnpm test:integration:local` in `ferio-nest-prisma`.

- Current tenant migration head applied successfully: 51 migrations.
- Test suites: 11 passed, 1 skipped, 12 total.
- Tests: 48 passed, 1 skipped, 49 total.
- The skipped suite is Redis-dependent and is not claimed as passing.

This confirms the backend API integration harness can bootstrap against the
configured local Docker PostgreSQL profile and execute the current integration
coverage without touching the development database. It does not prove that
the browser BFFs, SSR host forwarding, Cloudflare tunnel, WebSocket rooms, or
two independent tenant hosts work end to end.

## Follow-up gate

Start the application processes and run the live two-host browser test through
the Cloudflare tunnel. Capture separate tenant records and verify that
tracking, pickup availability, session cookies, SSR data, API responses, and
cache keys cannot cross the host boundary. Keep Redis-dependent evidence
separate until the existing Redis service is intentionally included in that
runtime plan.

Release 1 checklist percentage remains unchanged because this is supporting
evidence, not proof of the external host-routing and browser acceptance gate.
