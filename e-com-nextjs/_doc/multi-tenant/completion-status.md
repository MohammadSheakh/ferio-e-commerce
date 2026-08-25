# Ferio SaaS Multi-Tenancy — Completion Status & Remaining Work

**Date:** August 25, 2026
**Sources of truth:** `Ferio-Commerce-SaaS-PRD-v2.1.md` (product) · `implementation-checklist-and-schedule-multitenant.md` (tracker, audited line-by-line for this report)
**Companion evidence:** `project-progress/` (18 increment records) · `adr/` (8 ADRs) · `product-owner-decisions-log.md` (PO-001..020 approved)

---

## 1. Headline Numbers

| Measure | Value |
|---|---|
| Checklist items total (MT-0 → MT-14 + decision/CI/DoD sections) | **806** |
| Done `[x]` | 227 |
| PARTIAL (weighted ½) | 23 |
| Pending `[ ]` | 556 |
| **Literal weighted completion (whole program)** | **≈ 30%** |
| **Literal completion, Release-1 scope only** (excl. Release 2/3 sections) | **≈ 32%** |
| **Engineering-adjusted completion, Release-1 scope** — crediting implemented-but-unmarked work with per-item justification | **≈ 56%** |

> Why two numbers: the literal count under-reports reality. Several releases had their *code* delivered in a later pass than the checklist lines were written (e.g., the entire MT-3 connection manager is built and unit-tested while its §6.1 lines remain unchecked). The adjusted column credits code that exists and is tested, citing where. Conversely, nothing is credited that lacks tests or wiring.

### Per-release scoreboard

| Release | Items | Literal % | Adjusted % | State summary |
|---|---:|---:|---:|---|
| MT-0 Architecture freeze | 32 | 62% | **75%** | ADRs/classification done; threat-model sign-off + process items open |
| MT-1 Control plane | 52 | 82% | **92%** | Fully built+tested; control-plane migration test needs CI runner |
| MT-2 Resolution/context | 32 | 58% | **85%** | Resolver/membership/context shipped; dev host mapping + WS/log identity propagation partial |
| MT-3 DB router | 34 | 1%⚠ | **85%** | ⚠ Literal number is stale — manager fully built+tested; isolation proven in gated integration suite; load tests open |
| MT-4 Provisioning | 49 | 21% | **75%** | Orchestrator/bootstrap/seed/lifecycle/console done; smoke-test step, recovery runbook, full seed refactor open |
| MT-5 Domains/routing | 31 | 24% | **65%** | Resolution+states done; wildcard DNS record/TLS = ops task; custom-domain automation deferred (PO-008) |
| MT-6 Plans/billing | 52 | 51% | **80%** | Catalog+lifecycle+gates+SSLCommerz billing done; usage reconciliation, admin-billing views, manual adjustments open |
| MT-7 Module migration | 122 | 41% | **58%** | Catalog/settings/orders/checkout/payments-callback/wallet-tx-path/messaging/notifications/reports-overview/purchase-activity swept; customers-search/wallet-endpoints/coupons-explicit/zones-explicit/returns/settlements/shipping/chat-REST remaining |
| MT-8 Redis/jobs/sockets | 44 | 34% | **45%** | Envelopes/fan-out/scoped keys+rooms done; object storage (PO-017 util wired to S3 only), dead-letter policy, full key inventory tail pending |
| MT-9 Platform Admin | 48 | 38% | **55%** | Org mgmt/plans/provisioning timeline/support-access done; dashboard secondary tiles + billing views + closure UI open |
| MT-10 Tenant SaaS UX | 48 | 19% | **55%** | Entitlement gates + PlanUsageCard + setup checklist done; consolidated wizard, nav labels, branding extras open |
| MT-11 Migration orchestrator | 37 | 35% | **70%** | Canary/batch/pause/resume/dashboard done; transient-retry tuning + safety runbooks + 10-DB validation exercise open |
| MT-12 Backup/restore/closure | 31 | 13% | **35%** | Closure workflow + PO-013 window done; backup/PITR execution owner-blocked on hosting choice |
| MT-13 Hardening | 48 | 5% | **30%** | Strict typecheck/build/unit gates live in CI; many negative tests exist at unit level; observability metrics + load sims + dependency audit open |
| MT-14 Alpha/pilot | 36 | 0% | **0%** | Operational — blocked on hosting/DNS + pilot businesses |
| Release 2 CRM/growth | 33 | 0% | 0% | Intentionally gated behind stable Release-1 SaaS |
| Release 3 optimization | 19 | 0% | 0% | Trigger-based candidates |
| §20 Decisions checklist | 23 | 4% | **~87%** | PO-001..020 recorded; 7 residual sub-decisions listed in §7 below |
| §25 CI/CD gate | 18 | 0% | **~60%** | Backend build/typecheck/unit/integration/smoke + 3 web builds live; secret scan, dep audit, platform-admin rider surface, migration-compat check pending |
| §26 Definition of Done | 17 | 0% | **~50%** | 8 of 17 statements already true; rest depend on rows above |

---

## 2. What Is Incomplete — Itemized

Grouped by what unblocks it. Everything below is **not yet done**; anything not listed here is complete per the tracker.

### A. Blocked on OWNER decisions / infrastructure (cannot be coded yet)

| Item | Tracker ref | Blocking input |
|---|---|---|
| Physical tenant-DB executor swap to managed hosting (provisioning step) | §7.1 | Hosting provider selection |
| Wildcard DNS record + wildcard TLS certificate | §8.1 | Production domain + DNS/TLS provider |
| Custom-domain certificate automation | §8.2 (PO-008 defers to post-alpha) | DNS/TLS provider |
| Backup/PITR strategy execution + restore exercise | §15.1–15.2, PO-012 targets set | Managed-PostgreSQL choice |
| Credential vault production storage (KMS/Secret Manager) | §11.5, PO-010 direction | Secret-management selection |
| Object-storage production provider (S3/R2/MinIO) + lifecycle rules | §11.4, PO-017 abstraction done | Provider selection |
| Residency guarantee language | §20 PO-020 | Legal review |
| Plan prices (amountMinor stays 0 until pilots inform pricing) | PO-001 | Pilot economics |
| Support-access approval workflow policy detail | §12.5 | Policy sign-off |

### B. Needs the CI disposable-PG runner (enabled last increment — suites now run; these are follow-on expansions)

| Item | Tracker ref |
|---|---|
| Control-plane migration validation job | §25 |
| Two-tenant DB provisioning inside every CI run (already exercised by bootstrap suite) | §25 |
| Expand integration coverage: cart→checkout→COD vertical across two tenants end-to-end | §23 task 18 / MT-7 gate |
| Cross-tenant matrix expansion: wallet endpoints, customer search, returns/settlements, chat REST, rider assignment/GPS | §16.2, §24 |
| Load simulation: resolver + connection manager at 10/50/100 tenants | §16.3 |
| Migration validation exercise: 10 disposable DBs incl. one injected failure | §14.4 |

### C. Code work remaining (with effort estimates)

**MT-7 continuation — sweep the remaining tenant-plane services (~5–8 days)**
| Service | Est. | Notes |
|---|---|---|
| `CustomersService` search/profile/history | 1d | Same `db()` pattern as catalog/cart |
| `WalletService` standalone endpoints (top-up list/review outside checkout tx) | 0.5d | Debit/refund paths already tenant-correct via passed transactions |
| `ReturnsService`, `RefundsService`, `RtoService`, `SettlementsService` | 2d | Mechanical sweeps; financial-path correctness already proven via order-service tx passing |
| `ShippingService` (fulfillment queues, shipment create/callbacks/polls) | 1.5d | Callback routing already tenant-bound via cbt token |
| Chatting REST (`ConversationService`, `MessageService`) | 0.5d | Socket side namespaced (MT-8); REST lookup remains |
| Coupon/delivery-zone explicit service sweeps | 0.25d | Mostly swept transitively through checkout.service |
| Staff-seat style gates: courier config, notification templates per tenant | 0.5d | After credential vault exists |

**Platform Admin console completion (~2–3 days)**
- Dashboard tiles: migration fleet status, domain health, DB health, billing outcomes, usage alerts, backup status (§12.1)
- Subscriptions view + invoices/attempts view + manual adjustment w/ reason+audit (§12.3)
- Closure initiate/finalize buttons over existing endpoints (§12.2)
- Tenant cache-invalidation endpoint (§12.4)

**Tenant UX completion (~2–3 days)**
- Consolidated setup wizard (checklist card exists; wizard is polish), logo upload (needs object storage), order-prefix field, courier/notification config pages, catalog-import guidance (§13.1)
- Nav upgrade-labels + pre-limit warnings (§13.2)

**MT-13 observability (~2–3 days)**
- orgId/domain into structured log envelope; resolver unknown-domain + denial counters surfaced through operations-health (§16.1)

**Small code debts (< 0.5 day each)**
- Dev per-host mapping table (§5.1 PARTIAL)
- Domain-verification-pending storefront state (§8.3)
- Dead-letter retention policy for BullMQ (§11.2)
- Sitemap/robots tenant-awareness (§8.1)
- "Global Order History = tenant-global" label clarification (§10.12)

### D. Process/documentation (no code)
- Threat-model sign-off (MT-0 gate) · tenant-boundary PR checklist doc (MT-0) · media ownership/retention doc (§3.2) · compensation runbook for partial provisioning failure (§7.1) · expand/migrate/contract + rollback runbook (§14.3) · operational runbooks bundle (MT-14 gate)

---

## 3. Path to Each Milestone

```
FLAG-ON (TENANCY_ENABLED=true in a staging environment):
  ✙ Finish MT-7 sweeps for customers + wallet endpoints + chat REST   (~2d)
  ✙ Courier polling/callback sweeps ride fan-out                      ✔ done
  ✙ Reconciliation schedule fans out                                  ✔ done
  ✙ Membership guard on all admin controllers                         ✔ done
  ✙ Socket rooms scoped                                               ✔ done
  ➜ Remaining: staff/customer identity note in docs + staging DNS hosts

INTERNAL ALPHA (MT-14 §17.1):
  ➜ Flag-on + managed Postgres chosen + Platform Admin console driven
    through: org create → provision → assign internal plan → operate

PILOT (MT-14 §17.2):
  ➜ Alpha clean + wildcard DNS/TLS live + SSLCommerz billing exercised
    with real amounts + backup/restore exercise recorded

LAUNCH GATE:
  ➜ §17.3 all-pass + §26 DoD all-check + branch protection enforcing CI
```

---

## 4. Verification snapshot (as of this report)

- Cacheless strict `tsc --noEmit`: **0 errors repo-wide including specs**
- Backend production build: clean
- Web apps (Customer/Admin/Platform): strict tsc clean, production builds pass
- Test suites: **75 unit suites / 311 tests green**
- Integration suites (disposable PG): bootstrap idempotency, exactly-once seed, cross-tenant row isolation with colliding IDs, publish-filter proof — running in CI since runner enablement
- BullMQ runtime smoke: scheduler/retry/delivery against real Redis — running in CI

---

## 5. Reading this report honestly

The literal tracker percentage (≈30%) is the conservative floor: it counts only what the checklist explicitly marks. The adjusted ≈56% credits tested code that exists but whose checklist lines were not individually flipped during fast multi-file increments — every such credit cites the progress record where the evidence lives. Neither number includes Release 2/3 scope.

Two cautions:
1. **PARTIAL ≠ done.** Items marked PARTIAL have named gaps; do not treat them as complete when sequencing.
2. **Flag-on is gated by people-process, not ambition:** the membership guard sweep, fan-out coverage, and socket scoping are done, but `TENANCY_ENABLED=true` should wait for the remaining MT-7 sweeps (customers/wallet/chat REST), credential-vault storage, and a green cross-tenant suite in CI on the target hosting.
