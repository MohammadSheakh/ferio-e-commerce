# MT-12 Financial Ledger and Reconciliation Restore Verification

## Reconciled control

The read-only restore verifier now checks financial and reconciliation
invariants before a restored tenant is considered structurally healthy:

- payment and refund amounts cannot be negative;
- refund attempts must reference an existing refund;
- completed wallet transactions must satisfy their before/after balance
  equation;
- reconciliation run counters must be nonnegative and internally consistent;
- the required payment, refund, wallet, and reconciliation tables must exist;
- the latest completed Prisma migration is still required.

The verifier never mutates the restore database. Provider settlement,
external payment confirmation, and object/media existence remain separate
provider-backed checks.
