# 7. Study And Verification Checklist

## Before reading code

- Read PRD sections 9 through 16 for surfaces, journeys, requirements, state
  models, business rules, and data ownership.
- Read checklist MT-0 through MT-3 for the non-negotiable tenancy contract.
- Read MT-7 through MT-14 only after understanding the platform/tenant split.
- Read the API verification index before using an endpoint example.

## For every feature

- [ ] Identify module, controller, DTO, service, database helper, and tests.
- [ ] Record whether it is platform-plane, tenant-plane, public, or worker.
- [ ] Verify the host/context source; reject client-selected tenant identity.
- [ ] Verify auth, membership, permission, and ownership checks.
- [ ] Verify transaction and idempotency boundaries for writes.
- [ ] Verify queue, Redis, object, and socket namespace behavior.
- [ ] Verify failure states and stable error codes.
- [ ] Compare route/method/schema with API documentation.
- [ ] Compare the business behavior with the PRD and checklist gate.

## Isolation matrix

Use two disposable organizations with overlapping product/customer/order IDs.
Test both directions:

```text
host A -> A data
host B -> B data
host A cannot read or mutate B data
host B cannot read or mutate A data
unknown host fails closed
suspended tenant blocks commerce mutations
worker for A cannot acquire B database
socket room A cannot receive B event
```

## Evidence classification

Mark each result as one of:

- source inspection;
- automated unit/integration evidence;
- local Docker runtime evidence;
- public staging evidence through Cloudflare Tunnel;
- managed production/provider evidence;
- human pilot or release approval.

Do not promote a lower class into a higher class. In particular, local Docker
backup/restore is not managed PITR, and public staging is not production SLO
evidence.

## Suggested commands

```bash
cd ferio-nest-prisma
pnpm typecheck:application
pnpm architecture:check
pnpm check:tenant-context-boundaries
pnpm check:migrations
pnpm test -- --runInBand
pnpm test:integration:local
```

Run the complete suite only with the documented local database/Redis profile.
Never point destructive tests at a valuable tenant or shared production data.
