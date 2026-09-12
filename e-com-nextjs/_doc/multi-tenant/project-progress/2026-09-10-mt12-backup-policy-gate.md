# MT-12 Production Backup Policy Gate

**Date:** 2026-09-10  
**Status:** Implemented; provider execution remains open

Added `scripts/validate-backup-policy.mjs` and the `check:backup-policy`
package script. In a production policy environment the validator fails closed
unless the deployment supplies:

- a selected non-placeholder managed provider;
- provider-managed PITR enabled;
- at least 30 days of retention;
- RPO no greater than 60 minutes;
- RTO no greater than 240 minutes; and
- a bounded nightly logical-backup schedule.

The validator does not connect to a provider, inspect credentials, or claim
that a provider is configured. It is a deployment preflight for ADR-0009 and
PO-012. Provider-side scheduling, secret-manager wiring, alerting, and a
measured restore drill remain required before production readiness.
