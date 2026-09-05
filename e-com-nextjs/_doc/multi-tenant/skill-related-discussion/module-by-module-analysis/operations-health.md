# Operations Health Module

## Scope

Admin readiness and health evidence for database, Redis, queues, commerce,
couriers, payments, backups, and tenant operations.

## Architecture Score

**64%**. The operational surface is valuable and structured, but the earlier
base-database commerce evidence issue means the dashboard can misrepresent a
tenant unless its plane is explicit.

## Routes

| Route | Score | Review |
|---|---:|---|
| `GET /admin/operations/health` | 62% | Good breadth of probes, but tenant and control-plane evidence must be separated and labeled. |

## Confirmed Issues

- Health service still has a base-Prisma fallback path.
- Health checks can become expensive if called frequently without caching or
  time budgets.
- Readiness, liveness, dependency health, and operator diagnostics should be
  separate contracts.

## Tasks

1. Split control-plane, tenant-plane, and process liveness payloads.
2. Use bounded timeouts and cached expensive evidence.
3. Add tests proving tenant health never reports legacy commerce data.
