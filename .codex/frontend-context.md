# Frontend Context

This document applies to Ferio customer web, tenant admin, platform admin,
and mobile clients. Each client also has a scoped `AGENTS.md` for its boundary.

## Canonical Guidance

- [Design language](../e-com-nextjs/_doc/design-language.md)
- [Ferio design skill](../e-com-nextjs/.agents/skills/ferio-design/SKILL.md)
- [SaaS PRD](../e-com-nextjs/_doc/multi-tenant/Ferio-Commerce-SaaS-PRD-v2.1.md)
- [Frontend API integration audit](../e-com-nextjs/_doc/multi-tenant/project-progress/2026-08-26-frontend-api-integration-audit.md)
- [Project flow](../e-com-nextjs/_doc/multi-tenant/project-flow/README.md)

## Rules

- Preserve the Ferio design language; do not replace it with a generic dashboard template.
- Keep loading, empty, error, permission, and success states intentional and accessible.
- Treat backend authorization and entitlement checks as authoritative. Frontend gating is not security.
- Keep API types aligned with the backend OpenAPI contract; regenerate code when the contract changes.
- Do not duplicate tenant, platform, or user identity decisions in client-only state.
- Avoid leaking secrets or privileged platform data into browser bundles.
- Prefer small, composable components and typed data boundaries over large page components.
- Verify responsive behavior for desktop and mobile before considering UI work complete.
