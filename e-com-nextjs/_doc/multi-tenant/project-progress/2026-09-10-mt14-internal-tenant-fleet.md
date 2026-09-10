# MT-14 Internal Tenant Fleet Evidence

## Reconciled control

The internal-alpha minimum fleet control is covered by the existing
real-PostgreSQL bootstrap suite:

- `test/tenant-bootstrap.integration-spec.ts` creates 10 disposable tenant
  databases concurrently, exceeding the three-tenant minimum.
- Every database receives the canonical migration set and is checked against
  the same schema version.
- Every database passes the canonical readiness verifier before cleanup.
- The suite requires `TEST_DATABASE_URL` with `CREATE DATABASE` permission and
  remains mandatory CI evidence; no local run is claimed when that environment
  is unavailable.

This closes the internal test-fleet control only. It does not claim real
business onboarding, production domains, managed hosting, provider
configuration, or pilot feedback.
