# ADR-0008 — Platform Admin as a Separate Application Boundary

**Status:** ACCEPTED · **Date:** 2026-08-24

## Context

Checklist MT-0 left one structural decision open: whether Ferio Platform Admin is a fifth Next.js application or an isolated boundary inside the existing Tenant Admin repository.

The two surfaces share almost no domain logic — different auth realm (`PLATFORM_JWT_SECRET`, `realm=platform` tokens vs tenant user sessions), different database (control plane only), different personas (Ferio operators vs business staff), and different blast radius. The strongest argument for co-location (shared components/design system) is weak here: the console is metadata tables and state machines, deliberately boring per the design language.

Meanwhile the risk of co-location is concrete and demonstrated in this very codebase's history: shared bundles invite shared guards, cargo-cult headers, and accidental client-side reuse of privileged fetch helpers. PRD §9.4 requires Platform Admin "must not reuse tenant-admin authorization or silently bypass tenant isolation."

## Decision

Ship **`ferio-platform-admin`** as a separate Next.js App Router application:

- Own origin/deployment; never shares cookies, middleware, or fetch helpers with Tenant Admin.
- Talks ONLY to `/api/v1/platform/*` control-plane endpoints.
- Session = httpOnly cookie holding a `realm=platform` JWT minted exclusively by the platform login endpoint; initial SUPERADMIN seeded from environment (`PLATFORM_INITIAL_SUPERADMIN_EMAIL` / `_PASSWORD_HASH`) when the table is empty.
- Every page renders control-plane metadata; the app has no tenant-database connection of any kind.
- Design language applies unchanged — grayscale, hairlines, pill buttons, dense operational tables.

## Consequences

**Positive:** isolation is enforced by deployment topology rather than review discipline; the tenant-admin bundle can never leak platform routes; independent deploy/rollback.
**Negative/obligations:** one more app to build/CI; any future "manage tenant data" feature MUST route through explicit, audited support-access grants rather than convenient direct queries.

## Alternatives rejected

- Boundary inside tenant admin repo: rejected — history shows guard/role drift under co-location; isolation-by-convention fails exactly when teams are smallest.
