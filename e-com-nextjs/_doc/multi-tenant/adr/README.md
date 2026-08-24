# ADR Register — Ferio Multi-Tenant SaaS

Status legend: `PROPOSED` → `ACCEPTED` (owner sign-off pending where noted) → `SUPERSEDED`.

| ADR | Title | Status |
|---|---|---|
| [ADR-0001](ADR-0001-database-per-tenant.md) | Database-per-tenant isolation model | ACCEPTED (owner confirmation pending) |
| [ADR-0002](ADR-0002-tenant-resolution.md) | Host-based trusted tenant resolution | ACCEPTED (default production domain owner-blocked) |
| [ADR-0003](ADR-0003-tenant-connection-management.md) | Bounded tenant Prisma connection management | ACCEPTED |
| [ADR-0004](ADR-0004-platform-identity-vs-membership.md) | Platform identity vs tenant membership | ACCEPTED (cross-tenant staff login policy owner-blocked) |
| [ADR-0005](ADR-0005-tenant-migration-orchestration.md) | Tenant migration orchestration (canary/batch/fleet) | ACCEPTED |
| [ADR-0006](ADR-0006-subscription-entitlement-enforcement.md) | Centralized subscription/entitlement enforcement | ACCEPTED (plan catalog owner-blocked) |
| [ADR-0007](ADR-0007-tenant-closure-export-retention.md) | Tenant closure, export, and retention | PROPOSED (policy owner-blocked) |

Each ADR records context, decision, consequences, and the negative alternatives rejected, so future contributors can challenge decisions with evidence rather than folklore.
