# Reports Module

## Scope

Admin operational overview and order exports.

## Architecture Score

**70%**. The recent bounded aggregation direction is positive, but reports
remain expensive and exports should not compete with request traffic at scale.

## Routes

| Route | Score | Review |
|---|---:|---|
| `GET /admin/reports/overview` | 74% | Useful dashboard query; verify tenant scope, date bounds, and aggregation indexes. |
| `GET /admin/reports/orders-export` | 62% | Synchronous export is bounded but should become an asynchronous job for large tenants. |

## Tasks

1. Add explicit maximum date range and row budget tests.
2. Introduce queued export jobs with tenant envelope and signed download URLs.
3. Add read models/materialized aggregates for dashboard metrics.
