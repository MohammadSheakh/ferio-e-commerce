# Backend Architecture Skill V2 Analysis

## Purpose

This document explains the design of
`.agents/skills/ferio-backend-architecture-v2/SKILL.md`. The original
`.agents/skills/ferio-backend-architecture/SKILL.md` is intentionally unchanged.

## Video Principles Applied

### 1. Rules over general advice

The subtitle's most important point is that a skill should change agent
behavior. V2 therefore uses explicit language:

- **MUST** for release-blocking rules;
- **MUST NOT** for prohibited behavior;
- **SHOULD** for defaults that permit justified exceptions;
- numbered completion gates and evidence requirements.

The old skill contained strong guidance, but V2 turns the most important parts
into decisions an agent can check before declaring success.

### 2. Start with shared understanding

The video recommends exploring the repository before implementation and
maintaining a shared understanding. V2's **Discover Before Editing** rule
requires inspection of bootstrap, target module, guards, database clients,
queues, tests, configuration, and documentation before editing.

For large work, the agent must create a durable scope/acceptance checklist or
spec before implementation. This matches Ferio's existing tracking documents
without introducing an external issue tracker requirement.

### 3. Use durable context for multi-session work

The video describes specs and tickets for work that cannot fit safely in one
context window. V2 adapts this to the repository:

- small fixes use a lightweight checklist;
- cross-module refactors use tracked acceptance criteria;
- large features use a durable spec and sliced tickets;
- structure work is recorded in `file-folder-structure-track.md`;
- architecture changes are recorded in the relevant ADR/project-flow docs.

This avoids forcing ceremony onto small tasks while preventing large changes
from existing only in ephemeral chat context.

### 4. Implementation and review are separate concerns

The video emphasizes a fresh review after implementation. V2 requires an
independent review pass or fresh context for substantial work and defines the
specific defect classes to inspect: tenant leakage, unsafe fallbacks, missing
guards, unbounded work, transaction/network boundaries, weak types, and worker
context.

## Ferio-Specific Rules Added In V2

### Multi-tenant safety

V2 makes the tenant boundary non-negotiable:

- host resolution is the only request routing input;
- `TenantDbService.get()` is required for tenant-only work;
- platform and tenant Prisma clients are separate;
- jobs reconstruct context from trusted organization envelopes;
- caches, sockets, objects, and queues require tenant identity where needed.

### Folder and module structure

V2 records the structure actually established in the codebase:

```text
module.ts
controllers/
services/
dto/
adapters/ or gateways/
processors/
queues/
policies/
utils/
tests/
```

It also records the important exception: small cohesive modules may remain
flat. This prevents the agent from creating empty folders or splitting services
for cosmetic consistency.

### Scalability and capacity evidence

The video is about skill workflow, not system capacity, so V2 adds the Ferio
specific engineering standard:

- every shared resource must be bounded;
- noisy tenants must be isolated;
- expensive reads must become projections, aggregates, read models, or jobs;
- retries need idempotency and backpressure;
- capacity claims require measured workloads and deployment evidence.

This is intentionally stricter than saying “use scalable architecture.”

### Verification gates

V2 requires typecheck, focused tests, the full test suite for meaningful code
changes, reference searches for moves, diff validation, and security/failure
tests appropriate to the change. A successful happy-path test is not enough.

## Principles Deliberately Not Copied Literally

### External installer and setup commands

The video describes installing a public skills repository and running its setup
command. Ferio already has a project-local skill and project documentation, so
V2 does not add an installer, external issue tracker, or setup CLI.

### Universal interview/grilling

The video shows an interview flow before implementation. V2 applies the useful
part, repository discovery, but does not require a long interview for every
small bug fix. Task size determines whether a checklist/spec is required.

### Specific issue-tracker labels

The video uses labels and an issue-tracker abstraction. Ferio's current source
of truth is Git plus local Markdown tracking, so V2 requires durable tracking
where the task warrants it without inventing labels that are not implemented.

### Automatic skill invocation policy

The video discusses user-invoked skills and low context overhead. V2 keeps a
short discriminating description and a focused body, but invocation policy is
left to the repository's existing Codex configuration. The skill should apply
when backend implementation/review work actually needs it.

## Why V2 Is Separate

The original skill was already used by the project and should not be changed
without an explicit migration decision. V2 is therefore a parallel candidate
that can be reviewed against real tasks. If it proves better, the project can
later promote it or selectively merge rules into the original.

## Validation

- Original `SKILL.md`: intentionally not modified.
- V2 frontmatter: includes a distinct valid name and description.
- V2 rules: cover discovery, task sizing, tenancy, structure, types,
  authorization, mutations, scalability, async/realtime, verification, review,
  and completion.
- Analysis: records what was adopted, adapted, and intentionally excluded.
