# Local PostgreSQL Commerce Evidence

Date: 2026-09-10

## Safe test target

The suites were executed against the existing disposable Docker database
`ferio_test_runner` on PostgreSQL host port `5433`. The earlier attempt against
`ferio_dev` was rejected by the shipping webhook suite's intentional
non-test-database guard; no guard was weakened.

The test database URL was supplied through the process environment and is not
stored here. Redis implementation/configuration and the mobile project were
not touched.

## Results

### Commerce and lifecycle batch

```sh
TEST_DATABASE_URL='postgresql://<operator-secret>@localhost:5433/ferio_test_runner' \
  pnpm exec jest --config ./test/jest-integration.json --runInBand \
  --runTestsByPath \
  test/plan-limit-lifecycle.integration-spec.ts \
  test/wallet-isolation.integration-spec.ts \
  test/order-confirmation.integration-spec.ts \
  test/shipping-webhook.integration-spec.ts \
  --verbose --detectOpenHandles
```

Result: **4 suites passed, 15 tests passed, 17.864 seconds**.

This covers plan upgrade/downgrade limits, wallet ledger isolation,
order-confirmation/fulfillment behavior, and courier webhook handling.

### Financial and activity batch

```sh
TEST_DATABASE_URL='postgresql://<operator-secret>@localhost:5433/ferio_test_runner' \
  pnpm exec jest --config ./test/jest-integration.json --runInBand \
  --runTestsByPath \
  test/settlements.integration-spec.ts \
  test/reconciliation.integration-spec.ts \
  test/purchase-activity.integration-spec.ts \
  --verbose --detectOpenHandles
```

Result: **3 suites passed, 16 tests passed, 6.398 seconds**.

This covers settlement, reconciliation, and purchase-activity tenant
boundaries. The run emitted existing `pg` client-query deprecation warnings;
they did not fail the suites and are recorded for future dependency cleanup.

## Interpretation

These results strengthen local internal-alpha evidence for tenant commerce,
financial, and activity flows. They do not prove live Cloudflare host routing,
SSR/BFF behavior, production provider callbacks, queue fairness, managed
backup/PITR, or real-business pilot readiness.
