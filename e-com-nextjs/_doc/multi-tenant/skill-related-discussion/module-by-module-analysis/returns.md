# Returns Module

## Scope

Admin return-case listing, creation, review, inspection, eligibility, and
order return history.

## Architecture Score

**78%**. Domain separation, actor-aware mutations, and audit intent are good;
concurrency and financial state coordination need additional tests.

## Routes

| Route | Score | Review |
|---|---:|---|
| `GET /admin/returns` | 80% | Bounded admin list and tenant membership expected. |
| `POST /admin/returns/:id/review` | 78% | Legal state transition and audit should be atomic. |
| `POST /admin/returns/:id/inspect` | 78% | Inspection evidence and duplicate processing require tests. |
| `GET /admin/orders/:orderId/returns/eligibility` | 80% | Must use authoritative order/payment state and tenant scope. |
| `GET /admin/orders/:orderId/returns` | 80% | Owner/order scope and projection are important. |
| `POST /admin/orders/:orderId/returns` | 78% | Idempotency and duplicate request behavior need tests. |

## Tasks

1. Add state-machine and concurrent-review tests.
2. Coordinate return/refund/inventory transitions transactionally.
3. Add retention and evidence storage policy.
