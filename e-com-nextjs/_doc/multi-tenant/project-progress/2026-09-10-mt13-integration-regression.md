# MT-13 Integration Regression Evidence

Date: 2026-09-10

## Command

```bash
pnpm run test:integration:local
```

The local runner prepared `ferio_test_runner` on the Docker PostgreSQL profile,
applied the canonical tenant migration chain, and ran the integration Jest
project in its documented local mode.

## Result

- Test suites: `11 passed`, `1 skipped` (12 total)
- Tests: `48 passed`, `1 skipped` (49 total)
- Tenant migration head: `20260908193000_tenant_messaging_provider_configs`
- Fresh tenant bootstrap evidence: 50 migrations applied per disposable
  tenant; repeated bootstrap was idempotent with 0 newly applied migrations.

The skipped suite remains intentionally excluded by the local integration
configuration. This evidence supports the existing CI-backed tenant
isolation/bootstrap gates; it is not a production capacity result and does
not close pilot or managed-infrastructure launch gates.
