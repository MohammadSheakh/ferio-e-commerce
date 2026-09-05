# Settlements Module

## Scope

Admin settlement listing, eligible collections, imports, templates,
preflight, and settlement creation.

## Architecture Score

**74%**. The module recognizes import/preflight separation and operational
workflow needs; large-file handling, idempotency, and financial reconciliation
need deeper evidence.

## Routes

| Route | Score | Review |
|---|---:|---|
| `GET /admin/settlements` | 76% | Bound date/status pagination and tenant scope required. |
| `GET /admin/settlements/eligible-collections` | 74% | Expensive eligibility query needs indexes/read model. |
| `GET /admin/settlements/imports` | 74% | Import history should expose safe status/error metadata only. |
| `GET /admin/settlements/imports/template` | 78% | Static/template response should be cacheable and versioned. |
| `POST /admin/settlements/imports` | 70% | File import must be size-limited, idempotent, and queued for large inputs. |
| `POST /admin/settlements/imports/preflight` | 72% | Good safety step; enforce bounded rows and duplicate detection. |
| `POST /admin/settlements` | 72% | Financial mutation requires transaction, audit, idempotency, and reconciliation. |

## Tasks

1. Add import job envelope, deduplication key, and failure quarantine.
2. Add financial invariant and rollback tests.
3. Define settlement read model and operational reconciliation runbook.
