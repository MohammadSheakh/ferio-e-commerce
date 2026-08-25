# Project Progress — PO-006: Platform SaaS Billing via SSLCommerz

**Date:** August 25, 2026 (twentieth increment)
**Scope:** Implements the platform-billing adapter decided in PO-006 — hosted SSLCommerz sessions for SaaS invoices, server-authoritative validation, idempotent callbacks — with financial isolation from tenant commerce money preserved structurally.

---

## What landed

### `PlatformBillingService` + public/operator controllers

**Invoice lifecycle**
- `ensureInvoice(organizationId, periodStart, periodEnd)` creates or reuses the open invoice, amounting directly from the subscription's plan (`amountMinor`) — prices stay pilot-dependent per the decision log.
- Human-readable numbers (`SI-YYYYMM-XXXXX`), unique-constrained.

**Payment initiation**
- Creates a `SaasPaymentAttempt(INITIATED)` with an unguessable reference BEFORE calling the gateway.
- Opens an SSLCommerz hosted session against `PLATFORM_SSLCOMMERZ_*` credentials (falls back to commerce store vars for dev; sandbox default).
- Success/fail/cancel/IPN URLs all carry `?ref=<reference>`; the gateway echoes them verbatim.

**Authoritative callback application**
- Public `/platform/billing/callback` route (excluded from tenant middleware by its platform prefix; no operator auth — gateways can't be operators).
- Integrity chain: unguessable reference → server-to-server `val_id` validation → tran_id equality → amount equality (minor-unit compare) → **atomic single transition** from INITIATED via conditional `updateMany`.
- Duplicate deliveries absorbed without side effects; failed validations recorded as FAILED evidence with reasons; unknown references throw NotFound rather than guessing.

### Financial isolation (structural)
All rows live in control-plane tables. No code path here touches tenant `CommercePaymentAttempt`, wallet ledgers, COD collections, or settlements — satisfying §9.3's "never write SaaS payments into tenant money" by construction.

## Verification

- Cacheless strict tsc non-spec errors: 0 · build clean.
- **75 suites / 311 tests passing** (+7 billing cases): open-invoice creation from plan amount · INITIATED attempt + hosted URL · validated-success single transition + paid flag + audit · duplicate absorption · val_id failure evidence · amount-mismatch refusal · unknown-reference rejection.

## Checklist movement

§9.3: adapter ✔ provider ✔ attempts ✔ verification/idempotency ✔ history ✔; retry/recovery PARTIAL (re-initiation works as fresh attempts; automated sweep pending).

## Remaining after this

1. **§11.5 credential vault** production storage per PO-010 (KMS deployment work).
2. **Wildcard DNS record** on the production domain (ops task).
3. **MT-14 alpha**: first sales-assisted tenant through console → provisioning → storefront → invoice → pay cycle end to end.
