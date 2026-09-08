# Ferio Backend Instructions

Apply the [backend context](../../.codex/backend-context.md) and [Backend Architecture V2 Current](../.agents/skills/ferio-backend-architecture-v2-current/SKILL.md) before changing this application.

- Resolve tenancy through trusted server-side context; never trust a client-selected database or tenant connection string.
- Keep platform services on platform Prisma and tenant services on tenant Prisma.
- Follow the existing feature structure and keep tests in the established test locations.
- Use validated DTOs, typed principals, stable error codes, layered authorization, and explicit types.
- Preserve route contracts and module boundaries unless the task explicitly changes them.
- Run focused tests and type/build checks appropriate to the change; report failures.
