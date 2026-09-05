# 5 September 2026 Brutal Honest Opinion Fix Track

This tracker records remediation work for
`5-sep-2026-brutal-honest-opinion.md`. The opinion document is an audit record
and must not be modified to make the project look better.

## Status Legend

- `TODO`: identified, not yet implemented
- `IN PROGRESS`: currently being implemented
- `DONE`: implemented and verified
- `BLOCKED`: requires an explicit product, infrastructure, or migration decision

## Remediation Queue

| ID | Finding | Status | Evidence / next action |
| --- | --- | --- | --- |
| BO-01 | Backend typecheck excludes production runtime modules and `any` remains widespread. | TODO | Build a full typecheck boundary, then remove exclusions incrementally with typed adapters and module-level tests. |
| BO-02 | ESLint permits explicit and unsafe `any` usage. | TODO | Establish a measurable baseline, enable errors for new production `any`, then reduce the legacy baseline. |
| BO-03 | Docker compose is development-oriented and unsafe as a production deployment. | TODO | Separate local compose from a hardened deployment configuration; remove insecure defaults and public infrastructure exposure. |
| BO-04 | Legacy database/Mongoose fallback paths remain in active backend modules. | TODO | Inventory every fallback, define migration exit criteria, then remove or isolate each path. |
| BO-05 | API contracts are generated per app but not centrally enforced. | TODO | Add one canonical contract workflow and CI drift detection before introducing a shared client package. |
| BO-06 | CI lacks lint, frontend/mobile tests, migration verification, image smoke tests, and strict dependency failure policy. | IN PROGRESS | Backend `lint` is now read-only; CI lint is intentionally deferred until the existing lint baseline is reduced. |
| BO-07 | Scalability claims lack load, saturation, failure, and multi-instance evidence. | TODO | Define capacity targets and add repeatable HTTP, WebSocket, queue, and database benchmarks. |
| BO-08 | Frontend has repeated fetch/parsing patterns, manual types, `any`, and no coherent test strategy. | TODO | Establish shared typed request/error utilities and test critical auth, tenancy, checkout, and admin flows. |
| BO-09 | Agent and skill rules are better documented than enforced by tooling. | TODO | Convert the highest-value rules into lint, type, architecture, contract, secret, and CI checks. |

## Change Log

### 2026-09-05

- Created this tracker; the audit document remains unchanged.
- Started BO-06 by separating read-only lint validation from auto-formatting.
- Read-only backend lint currently fails with 1,566 errors and 21,563 warnings, including project-service parsing failures for integration tests. A CI gate was not kept in a known-red state.
