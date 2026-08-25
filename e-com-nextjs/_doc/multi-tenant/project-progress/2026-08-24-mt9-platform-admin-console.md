# Project Progress — MT-9: Ferio Platform Admin Console

**Date:** August 24, 2026 (eleventh increment)
**Scope:** Release MT-9 — Ferio operators can now sign into a dedicated, isolated console to manage the SaaS fleet: organizations, provisioning, subscriptions/plans, domains, tenant-database health, and support-access grants.

---

## What landed

### 1. ADR-0008 — separate application boundary

`ferio-platform-admin` ships as a fifth Next.js app rather than a section inside Tenant Admin. Isolation is enforced by deployment topology: own origin, own httpOnly-cookie session (`realm=platform` JWT from `PLATFORM_JWT_SECRET`), zero tenant-admin code reuse, zero tenant-database connectivity. The full rationale lives in `_doc/multi-tenant/adr/ADR-0008-platform-admin-app-boundary.md`.

### 2. Backend: the missing identity + aggregates

The guard could verify platform tokens since MT-1, but nothing minted them. Now:

- **`PlatformAuthService`** — bcrypt credential verification against `PlatformUser`, enumeration-safe constant-shape failures, and one-time SUPERADMIN seeding from `PLATFORM_INITIAL_SUPERADMIN_EMAIL/_PASSWORD_HASH` (hash generation documented in `.env.example`).
- **`POST /platform/auth/login`** — issues an 8-hour `realm=platform` JWT with roles; every login writes a platform audit record.
- **`GET /platform/dashboard`** — lifecycle/subscription/database counts, provisioning-failure count, active-support-grant count. Metadata only; no tenant PII by construction.
- **`GET /platform/organizations/:id/provisioning-runs`** — step-level timeline for the console.
- **Support access listing + revocation** endpoints (`countActive`, org-filtered list).

### 3. The console itself (design-language compliant)

Five screens over a single catch-all BFF route (operator token stays in an httpOnly cookie; never exposed to client JS):

| Screen | Capabilities |
|---|---|
| **Login** | Operator credentials → session cookie |
| **Dashboard** | Fleet overview stats incl. provisioning failures and active grants |
| **Organizations** | List + create (name/slug/owner) |
| **Organization detail** | Metadata, members, subscription+plan, domains, tenant-DB health/schema version, **provisioning run timeline with per-step status**, run-provisioning button, suspend/reactivate via the audited state machine |
| **Plans** | Catalog table + create form with `featureKey=limit` entitlement compiler |
| **Support Access** | Active reason-bound/time-bound grants with immediate revocation |

All states follow `_doc/design-language.md`: paper background, ink type, hairline tables, uppercase micro-labels, solid-black pill actions, plain direct copy, error boundaries included.

## Verification

- Backend: build clean; 72 suites / 293 tests passing.
- Console: strict tsc clean; production build passes on Next 14.2.35.
- CI gained a fourth job (install → typecheck → build for the console).

## Checklist movement

§12.1 dashboard items ✔ · §12.2 organization management ✔ (console + API; closure/export flows remain policy-blocked per ADR-0007) · §12.3 plan administration ✔ (billing provider integration still owner-blocked) · §12.5 support access ✔.

## Honest notes

- Migration canary/batch controls (§12.4), backup evidence, and restore-status views intentionally await MT-11/MT-12 — their backing services land there.
- The login page has no rate limiting at the BFF layer; the backend's platform-realm guard plus deployment-level rate limiting (to be added with hosting) cover this — flagged for the hardening pass.

## Next

1. **MT-11**: migration orchestrator wiring onto the fan-out/envelope infrastructure (canary→batch→fleet with the console as control surface).
2. MT-10 tenant-owner onboarding wizard + membership-guard sweep across remaining admin controllers.
