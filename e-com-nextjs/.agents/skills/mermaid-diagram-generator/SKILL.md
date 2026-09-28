---
name: mermaid-diagram-generator
description: Create and review split Mermaid diagrams for Ferio user flows, API boundaries, tenant isolation, operations, and release evidence.
---

# Mermaid Diagram Generator

Use this skill when creating or correcting Mermaid source diagrams in
`e-com-nextjs/diagram/`. The diagrams are study aids for the implemented
websites, NestJS backend, API documentation, project-flow documents, and
release checklist. They do not replace source code, tests, or runtime evidence.

## Discover Before Drawing

Before editing a diagram:

1. Read the relevant PRD, checklist, project-flow/API documentation, and
   source files for the requested flow.
2. Identify the actors, frontend/BFF route, NestJS controller/service,
   authorization boundary, database plane, queue/provider boundary, and final
   response or evidence path.
3. Mark claims as implemented, documented, or requiring runtime evidence. Do
   not draw an unverified production guarantee as if it were proven.
4. Reuse the repository's existing numbered naming and update the diagram
   index when adding or renaming a file.

## Split By Boundary

Use one Mermaid file for one understandable business or infrastructure
boundary. Split large flows into 3-4 focused files when they contain multiple
phases, actors, or failure paths. Prefer these diagram types:

- `sequenceDiagram` for request, API, queue, provider, and response order;
- `flowchart TD` or `flowchart LR` for branching decisions and architecture;
- `stateDiagram-v2` for lifecycle transitions and allowed states.

Do not put the entire product in one Mermaid file. Add a navigation map or
study-path diagram when the set becomes large.

## Ferio Invariants

Every tenant flow must make the authority boundary clear:

- Tenant identity comes from the trusted host/domain resolver.
- Browser body, query, route parameters, cookies, or client-selected database
  URLs never select a tenant database.
- Tenant requests use tenant-scoped services and database access; platform
  operations use the control-plane database.
- Protected admin mutations show authentication, role/permission,
  membership, and service ownership/state checks.
- Workers reconstruct tenant context from a trusted organization envelope.
- Queue jobs, cache keys, object keys, socket rooms, and provider callbacks
  carry or verify tenant identity where collision is possible.
- External provider calls occur outside database transactions and show retry,
  idempotency, reconciliation, or dead-letter behavior when relevant.
- Frontend responses return through the BFF/API/service boundary. Never draw a
  database, object store, mail provider, or queue as responding directly to a
  browser actor.

## Renderer-Safe Mermaid

Use conservative syntax because the project renderer rejects some valid
Mermaid variants:

- Do not use `Note over` in sequence diagrams. Put important invariants in
  the README or coverage document instead.
- Keep `alt`, `else`, and `loop` labels short and plain. Avoid semicolons,
  complex punctuation, or long prose immediately before branch boundaries.
- Use simple alphanumeric participant and node IDs; put human-readable text
  in the label.
- In flowcharts, prefer `<br/>` for line breaks and quote or simplify labels
  containing syntax characters such as `/`, `;`, `{}`, or `()` when needed.
- Keep comments outside executable statements and end files with one normal
  newline, not a blank line.
- Avoid unsupported HTML, embedded JavaScript, or renderer-specific features.

## File And Index Contract

For a new diagram:

- Use `NN-short-kebab-case.mmd` under `diagram/`.
- Add one numbered entry to `diagram/README.md` with its purpose.
- Update `diagram/DIAGRAM-COVERAGE.md` when the set or evidence boundary
  changes.
- Update `29-diagram-navigation-map.mmd` when the diagram should be reachable
  from the master navigation map.
- Keep historical image artifacts separate from editable `.mmd` sources.

## Validation

Run the smallest useful checks after editing:

```bash
git diff --check -- diagram
find diagram -maxdepth 1 -name '[0-9][0-9]-*.mmd' -type f | wc -l
rg -l '^(sequenceDiagram|flowchart |stateDiagram-v2)' diagram/[0-9][0-9]-*.mmd | wc -l
```

For navigation changes, verify every `click` target exists. If a Mermaid
renderer is unavailable or broken, report that limitation and rely on
structural checks; do not claim visual rendering passed. Do not install or
modify project dependencies just to render diagrams unless explicitly asked.

## Completion Boundary

A completed diagram explains the flow and its important boundaries. It does
not prove DNS/TLS, provider delivery, browser SSR isolation, queue fairness,
backup RPO/RTO, capacity, or production readiness. Keep those claims open
until runtime or operator evidence exists.
