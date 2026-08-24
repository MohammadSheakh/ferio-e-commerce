# ADR-0001 — Database-per-Tenant Isolation Model

**Status:** ACCEPTED (owner confirmation pending) · **Date:** 2026-08-24 · **Deciders:** Engineering

## Context

Ferio is becoming a multi-tenant Commerce SaaS (PRD v2.1). The dominant architectural choice for tenancy is how tenant data is partitioned:

- **A. Shared schema + `tenantId` column** — cheapest to operate; every query, index, cache, and job must remember the tenant filter forever; a single forgotten `where` leaks data across businesses. Isolation is a discipline, not a boundary.
- **B. Schema-per-tenant on one server** — stronger isolation, but PostgreSQL schemas strain tooling (migrations, connections, `search_path` bugs) without reducing operational count.
- **C. Database-per-tenant** — hard isolation boundary: no SQL path can cross tenants; per-tenant backup/restore; per-tenant performance ceilings; noisy neighbors contained.

Ferio's SaaS selling points include strong isolation for independent Bangladesh businesses, many of whom will ask "can another store see my customers?" The existing codebase already centralizes data access through services, and Prisma 7 driver adapters make multi-client management practical.

## Decision

Adopt **database-per-tenant** with a separate **platform control-plane database**.

- Control plane (organizations, domains, tenant DB registry, plans, subscriptions, SaaS billing, usage, platform audit, support access) lives in its own PostgreSQL database (`PLATFORM_DATABASE_URL`).
- Every tenant's commerce data (catalog, orders, customers, wallet, returns, chat…) lives in that tenant's own database.
- Tenant databases contain **no foreign keys to control-plane tables**; cross-plane references use opaque IDs only.
- Redis/BullMQ/WebSocket/object-storage namespaces are tenant-prefixed from trusted context (ADR-0002), never from client input.

## Consequences

**Positive**
- Cross-tenant leakage requires compromising the control plane, not forgetting one WHERE clause.
- Per-tenant restore satisfies "restore one business without touching others."
- Per-tenant migration blast radius is one database.
- Deleting/exporting one tenant is bounded.

**Negative / obligations**
- Connection management becomes an engineering concern → ADR-0003 (bounded clients, eviction).
- Migrations become fleet operations → ADR-0005.
- Cross-plane workflows (provisioning, subscription suspension) cannot be single ACID transactions → saga-style steps with recorded results.
- Platform queries ("how many orders across all tenants?") need explicit aggregation design; ad-hoc cross-tenant SQL is impossible by construction — which is the point.

## Alternatives rejected

- Shared-schema `tenantId`: rejected as primary model because isolation-by-discipline contradicts G-07 ("one tenant must never read…another tenant's data") at our team size. It remains the fallback if tenant counts stay tiny AND owners accept weaker guarantees.
- Schema-per-tenant: rejected — most of the operational cost of C with less of the isolation benefit and worse ecosystem support.
