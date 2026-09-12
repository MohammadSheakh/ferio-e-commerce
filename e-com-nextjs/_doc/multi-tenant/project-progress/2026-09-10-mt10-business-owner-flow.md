# MT-10 Business Owner Flow Evidence

**Date:** 2026-09-10  
**Status:** Internal two-tenant integration gate closed; pilot remains open

The real-PostgreSQL `two-tenant-vertical.integration-spec.ts` now exercises
the business-owner path for two independently bootstrapped databases:

1. tenant-local settings are configured and read through the service;
2. the owner publishes a tenant-local catalog and product;
3. a guest cart reaches checkout and places a COD order;
4. the order is confirmed and moved through `PICKING`, `PACKED`, and
   `QUALITY_CHECKED` by the real `OrderService`; and
5. the opposite tenant cannot read the order or fulfillment state, even though
   both tenants intentionally use the same logical product identifiers.

The test remains conditional on `TEST_DATABASE_URL` and is mandatory in CI.
Courier shipment creation and handover still require provider configuration,
so this evidence does not claim a live courier or real-business pilot.

## Local execution note

On 2026-09-10 the test was attempted against the configured Docker endpoint
`localhost:5433` using the disposable `ferio_dev` database. PostgreSQL was
reachable, but the integration global setup stopped at `prisma migrate deploy`
before the suite ran. No live two-tenant result is claimed from that attempt;
CI must continue to run the suite against a clean disposable PostgreSQL
service.
