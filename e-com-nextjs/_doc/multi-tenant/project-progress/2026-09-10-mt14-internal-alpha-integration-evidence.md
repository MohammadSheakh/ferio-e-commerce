# MT-14 Internal Alpha Integration Evidence

## Reconciled controls

Three internal-alpha checklist controls are backed by existing PostgreSQL
integration suites:

- Deliberately overlapping customer/product/order identifiers are seeded in
  two independently bootstrapped tenant databases by
  `test/two-tenant-vertical.integration-spec.ts`.
- The wallet flow covers tenant-local top-up, debit, refund, and idempotency
  behavior in `test/wallet-isolation.integration-spec.ts`.
- Plan upgrade/downgrade covers limit enforcement, upgrade unlock, and
  downgrade data preservation in `test/plan-limit-lifecycle.integration-spec.ts`.

These are automated internal-alpha integration controls, not evidence of real
business onboarding or a production pilot. Fulfillment/courier, warranty/
service/chat/pickup, real domains, provider configuration, and operator pilot
feedback remain open.

## Validation

The repository's full backend suite passes, and the listed integration suites
are mandatory CI evidence when disposable PostgreSQL is available.
