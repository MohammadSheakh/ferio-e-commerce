# Backend Context

Use this document when working in `e-com-nextjs/ferio-nest-prisma`.

## Canonical Guidance

- [Backend architecture V2](../e-com-nextjs/.agents/skills/ferio-backend-architecture-v2/SKILL.md)
- [SaaS PRD](../e-com-nextjs/_doc/multi-tenant/Ferio-Commerce-SaaS-PRD-v2.1.md)
- [Implementation checklist](../e-com-nextjs/_doc/multi-tenant/implementation-checklist-and-schedule-multitenant.md)
- [Architecture decisions](../e-com-nextjs/_doc/multi-tenant/adr/README.md)
- [Backend project flow](../e-com-nextjs/_doc/multi-tenant/project-flow/README.md)
- [Module analysis](../e-com-nextjs/_doc/multi-tenant/skill-related-discussion/module-by-module-analysis/README.md)

## Non-Negotiable Boundaries

- Platform data uses `PlatformPrismaService`; tenant data uses the resolved tenant database.
- A client, request body, job payload, or arbitrary connection string must never choose a tenant database.
- Tenant identity must come from trusted host/domain resolution or a trusted server-issued context.
- Controllers validate DTOs and authorize; services repeat ownership and tenant checks.
- New application-owned values must be explicitly typed. Do not introduce `any`.
- Cross-tenant leakage in HTTP, queues, cache keys, object storage, and sockets is a release blocker.

## Verification

Use the backend package scripts for focused tests, type checks, migrations, build,
and integration verification. Report failed checks honestly and update the
relevant tracker for architectural or structural changes.
