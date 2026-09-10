# MT-14 Two-Tenant Domain and Database Gate

## Reconciled control

The Release 1 launch gate requiring at least two independent test
organizations with isolated databases and domains is covered by the existing
real-PostgreSQL capstone:

- `test/two-tenant-vertical.integration-spec.ts` creates two disposable
  PostgreSQL databases with `CREATE DATABASE`.
- Each database is bootstrapped through `TenantSchemaBootstrapper` and receives
  its own tenant database material and tenant context.
- The contexts bind distinct hostnames (`{database}.ferio.test`) and the test
  exercises tenant-local storefront/catalog and commerce behavior.
- The suite is skipped without `TEST_DATABASE_URL` and is mandatory in CI, so
  this document does not claim a local run when the development PostgreSQL
  service is unavailable.

This closes the test-organization gate only. Production DNS/TLS provisioning,
real business onboarding, provider verification, and pilot execution remain
separate open controls.
