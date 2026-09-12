# Returns, RTO, Refunds, Settlements, and Reconciliation API Integration Shot 18

Date: 2026-09-11

## Scope

Audited the tenant-admin returns, refund, RTO, courier settlement, and
reconciliation screens and BFF routes against the NestJS controllers and DTOs.

## Findings

- Return creation, review, inspection, refund eligibility, refund creation,
  and refund-result callers match the BFF and guarded admin controllers.
- RTO inspection uses item-level quantities and three minor-unit cost fields;
  the frontend already submits that DTO. The previous documentation's single
  `costMinor` field and unsupported `from`/`to` list query were stale.
- Settlement imports and settlement creation forward `Idempotency-Key` as a
  request header and submit the required DTO fields. The previous import docs
  incorrectly described `idempotencyKey` as a JSON field.
- Reconciliation findings, scan, queue health, retry, and action callers match
  the BFF/controller methods. Finding actions require a note and support
  `CLAIM`, `ACKNOWLEDGE`, `RESOLVE`, and `REOPEN`.

## Changes

- Corrected `tenant-admin/returns-rto-refunds.md` with the actual return,
  refund, and RTO method/payload contracts, including minor-unit semantics and
  idempotency header handling.
- Corrected `tenant-admin/settlements-reconciliation.md` with the actual
  settlement paths, import body, idempotency header, query fields, and
  reconciliation action contract.

## Boundary notes

This is source-level contract evidence. It does not claim browser E2E,
provider settlement delivery, refund-provider behavior, queue fairness,
idempotency race proof, tenant-host isolation, backup/restore, or production
operational acceptance.
