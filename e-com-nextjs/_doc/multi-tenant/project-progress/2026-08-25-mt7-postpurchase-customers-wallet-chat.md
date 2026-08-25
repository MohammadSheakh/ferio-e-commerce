# Project Progress — MT-7 Continuation: Post-Purchase, Customers, Wallet, Chat REST

**Date:** August 25, 2026 (twenty-first increment)
**Scope:** The largest remaining block of MT-7 module sweeps — post-purchase financial records (returns/refunds/RTO/settlements), customer search/profile/addresses, wallet standalone endpoints, and chat REST — bringing the tenant-scope conversion to near-complete coverage of high-risk surfaces.

---

## What landed

### 26 additional methods swept across six services

| Service | Methods | Notes |
|---|---:|---|
| `ReturnsService` | 6 | Case creation (eligibility gate runs on tenant client), review, inspection, inventory disposition |
| `RefundsService` | 4 | Refund attempts with attempt-number race guard |
| `RtoService` | 2 | RTO case + item handling |
| `SettlementsService` | 3 | Canonical CSV imports, collection listing — evidence rows stay beside the tenant orders they settle |
| `CustomersService` | 3 | Search/profile/history for admin plane |
| Chat REST (`Conversation` + `Message`) | 19 | Conversation lookup/participants/history and message persistence — realtime rooms were already namespaced in MT-8 |

Every sweep used the verified single-pass transform with post-verify (resolution-before-first-use · async-only insertions · zero legacy strays). Two sync-method signatures flipped (`list` ×2, `eligibleCollections`) after confirming all call sites await.

### Checklist §10.9 / §10.7 / §10.4 now substantially closed

- Returns/refunds/RTO/settlement records: **tenant-scoped by construction**
- Settlement imports + manual retries: tenant-resolved
- Wallet: strictly tenant-local including standalone top-up evidence/review endpoints; cross-tenant portability impossible (separate ledgers)
- Customer search/profile/addresses: cannot cross databases
- Chat: REST lookup/history tenant-resolved + org-scoped realtime rooms (MT-8)

## Verification

- Build clean; strict tsc non-spec errors: 0.
- **75 suites / 311 tests passing.**

## Remaining MT-7 tail (small)

1. Coupon/delivery-zone explicit sweeps — mostly transitive via checkout.service already; formalize if desired.
2. Shipping service sweep (fulfillment queue queries) — same pattern.
3. Cross-database integration cases for wallet + reorder (CI runner already executes the harness).

After those three small passes, **MT-7 is complete** and the flag-on blocker list reduces to: credential vault storage (PO-010 deployment), wildcard DNS record (ops), and the two-tenant end-to-end proof run in CI.
