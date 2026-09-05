# Ferio Project Context

This file is the starting map for Codex work in the Ferio Commerce repository.
Read the relevant source-of-truth documents before making changes. Do not
duplicate their requirements here; keep this file as a stable navigation and
working-context index.

## Product And Delivery Sources

- [Ferio Commerce SaaS PRD v2.1](e-com-nextjs/_doc/multi-tenant/Ferio-Commerce-SaaS-PRD-v2.1.md)
  - Product requirements, scope, actors, tenancy decisions, and acceptance expectations.
- [Multi-tenant implementation checklist](e-com-nextjs/_doc/multi-tenant/implementation-checklist-and-schedule-multitenant.md)
  - Engineering execution tracker and release gates.
- [Product owner decisions](e-com-nextjs/_doc/multi-tenant/product-owner-decisions-log.md)
  - Decisions that resolve product ambiguity.
- [Architecture decision records](e-com-nextjs/_doc/multi-tenant/adr/README.md)
  - Durable technical decisions and their constraints.

When documents disagree, pause and identify the conflict. The PRD is the
product source of truth, the implementation checklist is the delivery tracker,
and ADRs explain the accepted architecture choices.

## Engineering Skills

- [Backend architecture V2](e-com-nextjs/.agents/skills/ferio-backend-architecture-v2/SKILL.md)
  - Rule-driven NestJS, multi-tenant, security, scalability, review, and verification guidance.
- [Backend architecture V1](e-com-nextjs/.agents/skills/ferio-backend-architecture/SKILL.md)
  - Existing backend architecture reference. Keep unchanged unless explicitly requested.
- [Design skill](e-com-nextjs/.agents/skills/ferio-design/SKILL.md)
  - Ferio visual language and frontend implementation guidance.
- [Git commit and push skill](e-com-nextjs/.agents/skills/git-commit-push/SKILL.md)
  - Required commit, verification, and push workflow.

Use the V2 backend skill for new backend work and reviews. Treat the original
skill as historical/reference guidance, not as a file to silently rewrite.

## Design And Frontend Context

- [Design language](e-com-nextjs/_doc/design-language.md)
  - Visual system, interaction principles, and interface direction.
- [Customer web](e-com-nextjs/ferio-customer-web/README.md)
- [Admin dashboard](e-com-nextjs/ferio-admin-dashboard/ferio-admin/README.md)
- [Backend application](e-com-nextjs/ferio-nest-prisma/README.md)

Preserve the established Ferio design language when changing an existing
screen. Do not introduce a generic dashboard style without checking the design
documents first.

## Understand The Existing Flow

Read the relevant flow document before changing a cross-cutting path:

- [System map and learning path](e-com-nextjs/_doc/multi-tenant/project-flow/01-system-map-and-learning-path.md)
- [HTTP request lifecycle](e-com-nextjs/_doc/multi-tenant/project-flow/02-http-request-lifecycle.md)
- [Tenant resolution and database routing](e-com-nextjs/_doc/multi-tenant/project-flow/03-multi-tenant-resolution-and-database-routing.md)
- [Authentication and authorization](e-com-nextjs/_doc/multi-tenant/project-flow/04-authentication-and-authorization.md)
- [Platform admin and organization provisioning](e-com-nextjs/_doc/multi-tenant/project-flow/05-platform-admin-and-organization-provisioning.md)
- [Tenant commerce flow](e-com-nextjs/_doc/multi-tenant/project-flow/06-tenant-commerce-flow.md)
- [Async workers and integrations](e-com-nextjs/_doc/multi-tenant/project-flow/07-async-workers-and-integrations.md)
- [Realtime and operations](e-com-nextjs/_doc/multi-tenant/project-flow/08-realtime-and-operations.md)
- [Module map and change guide](e-com-nextjs/_doc/multi-tenant/project-flow/09-module-map-and-change-guide.md)

## Operational References

- [Docker and project commands](e-com-nextjs/_doc/multi-tenant/commands/updated_commands.md)
- [API documentation index](e-com-nextjs/_doc/multi-tenant/api-documentation/README.md)
- [Backup and restore runbook](e-com-nextjs/_doc/multi-tenant/runbooks/backup-restore.md)
- [Module-by-module analysis](e-com-nextjs/_doc/multi-tenant/skill-related-discussion/module-by-module-analysis/README.md)
- [Backend analysis tracking](e-com-nextjs/_doc/multi-tenant/skill-related-discussion/backend-analysis-tracking.md)
- [File and folder structure tracking](e-com-nextjs/_doc/multi-tenant/skill-related-discussion/file-folder-structure-track.md)

## Working Rules

1. Inspect the current code and relevant documents before editing.
2. For a new feature, establish the scope and acceptance behavior before implementation.
3. Preserve platform-versus-tenant boundaries; never let a client choose a database.
4. Keep API contracts, authorization, tenant isolation, failure behavior, tests,
   and documentation aligned with the implementation.
5. Prefer the smallest coherent change. Do not refactor unrelated code merely
   because it is nearby.
6. Verify changes with focused tests and type checks; use broader verification
   for cross-module or architectural changes.
7. Review the final diff, update the appropriate tracker when needed, and use
   the repository's commit and push workflow.

## Document Hygiene

This file is an index, not a replacement for the PRD, checklist, ADRs, skills,
or flow documents. When a source document moves, update this index in the same
change. Never place secrets, passwords, tokens, or environment values here.
