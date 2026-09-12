# Ferio Backend Pattern Curriculum

## Why this folder exists

The backend contains many features, but the same engineering shapes repeat:
validated controllers, tenant context, Prisma transactions, idempotent
commands, Redis namespaces, queue envelopes, provider adapters, and state
machines. Learning these patterns is faster and safer than reading every file
linearly.

These documents group 298 reusable patterns into twenty-three study blocks. For
each pattern, read the template source, one real feature implementation, and
one focused test. Then compare the pattern with the PRD and checklist gate.

## Study order

1. `01-http-boundary-and-security.md`
2. `02-tenant-context-and-database-routing.md`
3. `03-prisma-domain-and-transaction-patterns.md`
4. `04-auth-ownership-and-saas-controls.md`
5. `05-redis-queues-and-realtime.md`
6. `06-provider-integration-and-state-machines.md`
7. `07-data-exports-observability-and-recovery.md`
8. `08-frontend-bff-and-evidence-patterns.md`
9. `09-advanced-cross-cutting-patterns.md`
10. `10-nestjs-repetition-patterns.md`
11. `11-auth-provisioning-and-lifecycle-patterns.md`
12. `12-catalog-commerce-and-payment-patterns.md`
13. `13-shipping-recovery-storage-and-messaging-patterns.md`
14. `14-experience-realtime-and-financial-safety-patterns.md`
15. `15-platform-operations-and-evidence-patterns.md`
16. `16-identity-audit-and-file-patterns.md`
17. `17-cart-catalog-checkout-payment-patterns.md`
18. `18-order-shipping-returns-refunds-rto-patterns.md`
19. `19-account-notification-wallet-warranty-booking-patterns.md`
20. `20-chat-sockets-analytics-and-request-patterns.md`
21. `21-reports-settlements-reconciliation-health-settings-patterns.md`
22. `22-storage-redis-queues-and-messaging-infrastructure-patterns.md`
23. `23-platform-tenancy-common-and-test-patterns.md`

## The study loop

```text
pattern explanation
  -> source template
  -> feature example
  -> focused test
  -> failure mode
  -> PRD/checklist acceptance gate
```

Do not copy a pattern mechanically. First identify its trust boundary, state
owner, transaction boundary, retry behavior, and evidence level.

## Pattern index

| # | Pattern | Document |
| ---: | --- | --- |
| 1 | Global request pipeline | 01 |
| 2 | DTO whitelist validation | 01 |
| 3 | Stable error envelope | 01 |
| 4 | Correlation context | 01 |
| 5 | Rate-limit security event | 01 |
| 6 | Trusted forwarded host | 02 |
| 7 | Host normalization | 02 |
| 8 | Positive/negative resolver cache | 02 |
| 9 | Immutable AsyncLocalStorage context | 02 |
| 10 | Fail-loud tenant DB access | 02 |
| 11 | Platform/tenant database split | 03 |
| 12 | Repository through a database boundary | 03 |
| 13 | Interactive transaction | 03 |
| 14 | Idempotency key | 03 |
| 15 | Server-side price/stock revalidation | 03 |
| 16 | Authentication realm separation | 04 |
| 17 | Membership binding | 04 |
| 18 | Permission decorator and guard | 04 |
| 19 | Plan/entitlement gate | 04 |
| 20 | Suspended-commerce write guard | 04 |
| 21 | Tenant-namespaced Redis key | 05 |
| 22 | Redis cache-aside | 05 |
| 23 | Distributed lock | 05 |
| 24 | Trusted queue envelope | 05 |
| 25 | Tenant-safe WebSocket room | 05 |
| 26 | Provider adapter boundary | 06 |
| 27 | Webhook signature verification | 06 |
| 28 | Durable outbox/dispatch | 06 |
| 29 | Retry with idempotent claim | 06 |
| 30 | Domain state machine | 06 |
| 31 | Operator-derived export target | 07 |
| 32 | Backup/restore verification | 07 |
| 33 | Closure retention state machine | 07 |
| 34 | Sanitized structured logging | 07 |
| 35 | Operational alert emission | 07 |
| 36 | Request-aware BFF forwarding | 08 |
| 37 | SSR tenant metadata | 08 |
| 38 | Frontend failure/empty state | 08 |
| 39 | Source-to-test evidence chain | 08 |
| 40 | Local/staging/production evidence separation | 08 |
| 41 | Bounded offset/cursor pagination | 03 |
| 42 | Count-plus-page response envelope | 09 |
| 43 | Query parameter bounding | 09 |
| 44 | Cursor fanout across tenants | 09 |
| 45 | Chunked report/export processing | 09 |
| 46 | Latest-child nested query | 09 |
| 47 | Secret-box encryption boundary | 09 |
| 48 | Credential redaction | 09 |
| 49 | Raw-body signature boundary | 09 |
| 50 | Feature-flag staged rollout | 09 |
| 51 | Health/readiness degradation | 09 |
| 52 | Migration canary and batch orchestration | 09 |
| 53 | Media validation and malware quarantine | 09 |
| 54 | Graceful resource lifecycle | 09 |
| 55 | Tenant fanout checkpoint | 09 |
| 56 | Operational evidence artifact | 09 |
| 57 | Root module composition | 10 |
| 58 | Controller orchestration | 10 |
| 59 | Injectable service boundary | 10 |
| 60 | DTO query object | 10 |
| 61 | Guard/decorator metadata | 10 |
| 62 | Count-and-data parallel query | 10 |
| 63 | Bounded bulk command | 10 |
| 64 | Transaction callback service | 10 |
| 65 | Provider registry lookup | 10 |
| 66 | Test double and contract fixture | 10 |
| 67 | Architecture rule as executable check | 10 |
| 68 | Configuration validation at startup | 10 |
| 69 | Authentication token lifecycle | 11 |
| 70 | OTP single-use challenge | 11 |
| 71 | Two-factor step-up verification | 11 |
| 72 | OAuth identity verification | 11 |
| 73 | Device/session registration | 11 |
| 74 | Idempotent organization creation | 11 |
| 75 | Compare-and-set lifecycle transition | 11 |
| 76 | Provisioning step journal | 11 |
| 77 | Pluggable infrastructure executor | 11 |
| 78 | Retry/resume from incomplete step | 11 |
| 79 | Audit after committed state change | 11 |
| 80 | Owner membership versus tenant identity | 11 |
| 81 | Tenant-aware legacy compatibility | 12 |
| 82 | Aggregate stock reservation | 12 |
| 83 | Server-computed checkout preview | 12 |
| 84 | Configuration-driven coupon rule | 12 |
| 85 | Cart merge with ownership checks | 12 |
| 86 | Idempotency header contract | 12 |
| 87 | Explicit order transition guard | 12 |
| 88 | Append-only order timeline | 12 |
| 89 | Server-to-server payment validation | 12 |
| 90 | Payment recovery processor | 12 |
| 91 | Provider callback deduplication | 12 |
| 92 | Domain event side-effect dispatch | 12 |
| 93 | Courier adapter registry | 13 |
| 94 | Courier credential normalization | 13 |
| 95 | Webhook durable log before processing | 13 |
| 96 | Polling claim and bounded retry | 13 |
| 97 | Provider status normalization | 13 |
| 98 | Return-window eligibility policy | 13 |
| 99 | Refund ownership and idempotency | 13 |
| 100 | RTO terminal-state handling | 13 |
| 101 | Settlement report preflight | 13 |
| 102 | Reconciliation finding upsert | 13 |
| 103 | Signed storage URL boundary | 13 |
| 104 | Binary signature and size validation | 13 |
| 105 | Messaging channel adapter | 13 |
| 106 | Durable message dispatch status | 13 |
| 107 | Operational alert severity ordering | 13 |
| 108 | Tenant-scoped retry job | 13 |
| 109 | Socket ticket authentication | 14 |
| 110 | Tenant-scoped socket room | 14 |
| 111 | Transaction then realtime emission | 14 |
| 112 | Cursor message pagination | 14 |
| 113 | Notification deduplication key | 14 |
| 114 | Wallet immutable ledger | 14 |
| 115 | Atomic balance conditional update | 14 |
| 116 | Feature-gated customer submission | 14 |
| 117 | Domain status transition policy | 14 |
| 118 | Customer ownership query | 14 |
| 119 | Privacy-safe analytics event | 14 |
| 120 | Rate-limited public ingestion | 14 |
| 121 | Dependency health aggregation | 14 |
| 122 | Admin queue pagination | 14 |
| 123 | Tenant isolation fixture by context | 14 |
| 124 | Notification failure isolation | 14 |
| 125 | Report field masking by permission | 15 |
| 126 | Export audit event | 15 |
| 127 | Settings offset/cursor dual contract | 15 |
| 128 | Domain readiness aggregate | 15 |
| 129 | Credential-free health response | 15 |
| 130 | Time-bounded support access grant | 15 |
| 131 | Platform support scope enforcement | 15 |
| 132 | Migration canary barrier | 15 |
| 133 | Migration durable run state | 15 |
| 134 | Backup evidence freshness | 15 |
| 135 | Restore verification attestation | 15 |
| 136 | Tenant database registry readiness | 15 |
| 137 | Plan seed upsert | 15 |
| 138 | Usage counter idempotency | 15 |
| 139 | Platform audit JSON boundary | 15 |
| 140 | Operator health summary | 15 |
| 141 | Password hash boundary | 16 |
| 142 | Refresh-token rotation and revocation | 16 |
| 143 | Tenant-bound token claims | 16 |
| 144 | Login lockout state machine | 16 |
| 145 | OTP hashed, bounded, and single-use | 16 |
| 146 | Two-factor step-up challenge | 16 |
| 147 | Encrypted TOTP secret and hashed recovery codes | 16 |
| 148 | Verified OAuth identity boundary | 16 |
| 149 | Authenticated self-service ownership | 16 |
| 150 | Cache-aside profile reads with invalidation | 16 |
| 151 | Soft-delete device lifecycle | 16 |
| 152 | Audit context enrichment | 16 |
| 153 | Recursive audit redaction and truncation | 16 |
| 154 | Audit query boundary | 16 |
| 155 | Provider strategy boundary for uploads | 16 |
| 156 | Honest attachment feature boundary | 16 |
| 157 | Hashed guest-cart token | 17 |
| 158 | Sellable-variant revalidation | 17 |
| 159 | Aggregate available stock calculation | 17 |
| 160 | Guest-to-account cart merge | 17 |
| 161 | Reorder ownership and line filtering | 17 |
| 162 | Public/admin catalog projection | 17 |
| 163 | Slug normalization and conflict translation | 17 |
| 164 | Inventory adjustment invariant | 17 |
| 165 | Entitlement before catalog mutation | 17 |
| 166 | Bounded catalog pagination | 17 |
| 167 | Server-priced checkout preview | 17 |
| 168 | Delivery-zone normalization and uniqueness | 17 |
| 169 | Audited delivery-zone transaction | 17 |
| 170 | Configuration-driven coupon policy | 17 |
| 171 | Payment gateway registry | 17 |
| 172 | Encrypted provider credential envelope | 17 |
| 173 | Customer proof before anonymous payment initiation | 17 |
| 174 | Server-to-server callback validation | 17 |
| 175 | Callback deduplication and transaction claim | 17 |
| 176 | Expired-payment recovery claim | 17 |
| 177 | Order idempotency key | 18 |
| 178 | Explicit order transition policy | 18 |
| 179 | Atomic stock reservation | 18 |
| 180 | Exact inverse reservation release | 18 |
| 181 | Tenant-safe order reference lookup | 18 |
| 182 | Operational order timeline projection | 18 |
| 183 | Courier adapter contract | 18 |
| 184 | Courier credential envelope | 18 |
| 185 | Provider status normalization | 18 |
| 186 | Durable webhook log before processing | 18 |
| 187 | Recoverable polling attempt | 18 |
| 188 | Return-window eligibility policy | 18 |
| 189 | Return quantity conservation | 18 |
| 190 | Return inspection inventory disposition | 18 |
| 191 | Refund ownership and tenant isolation | 18 |
| 192 | Refund eligibility and cap | 18 |
| 193 | Refund settlement evidence | 18 |
| 194 | Refund attempt idempotency | 18 |
| 195 | RTO terminal reconciliation | 18 |
| 196 | Terminal-state retry barrier | 18 |
| 197 | Customer link by exact order proof | 19 |
| 198 | Customer profile fan-out | 19 |
| 199 | Owner-scoped address mutation | 19 |
| 200 | Default-address invariant | 19 |
| 201 | Tenant-local account lookup | 19 |
| 202 | Notification deduplication key | 19 |
| 203 | Owner-scoped notification read | 19 |
| 204 | Soft-deleted notification lifecycle | 19 |
| 205 | Count-plus-page notification contract | 19 |
| 206 | Wallet ensure-before-ledger | 19 |
| 207 | Wallet top-up idempotency | 19 |
| 208 | Atomic wallet debit with insufficient-balance guard | 19 |
| 209 | Idempotent wallet refund | 19 |
| 210 | Tenant-isolated wallet evidence | 19 |
| 211 | Warranty delivered-order prerequisite | 19 |
| 212 | One active warranty claim per item | 19 |
| 213 | Warranty transition table | 19 |
| 214 | Warranty feature gate | 19 |
| 215 | Service-booking feature gate | 19 |
| 216 | Booking time and lead-time policy | 19 |
| 217 | Snapshot mutable service data | 19 |
| 218 | Booking transition history | 19 |
| 219 | Conversation participant authorization | 20 |
| 220 | Transaction then participant notification | 20 |
| 221 | Cursor message pagination | 20 |
| 222 | Message ownership mutation | 20 |
| 223 | Durable chat notification queue | 20 |
| 224 | Signed socket organization context | 20 |
| 225 | Tenant-prefixed socket rooms | 20 |
| 226 | Strict unscoped-room rejection | 20 |
| 227 | Multi-socket presence accounting | 20 |
| 228 | Socket role derived from database | 20 |
| 229 | Tenant-safe REST-to-socket emission | 20 |
| 230 | Analytics field sanitization | 20 |
| 231 | Structured analytics event contract | 20 |
| 232 | Tenant-isolated analytics aggregation | 20 |
| 233 | Measured-evidence funnel | 20 |
| 234 | Bounded daily analytics aggregate | 20 |
| 235 | Privacy-safe purchase activity projection | 20 |
| 236 | Purchase activity pagination envelope | 20 |
| 237 | Public/admin product-request boundary | 20 |
| 238 | Bounded product-request pagination | 20 |
| 239 | Permission-aware report projection | 21 |
| 240 | Tenant-local report database | 21 |
| 241 | Keyset report accumulation | 21 |
| 242 | Integer-money report arithmetic | 21 |
| 243 | CSV formula-injection protection | 21 |
| 244 | Canonical settlement CSV template | 21 |
| 245 | Settlement row identity uniqueness | 21 |
| 246 | Settlement operational row limit | 21 |
| 247 | Settlement evidence before COD paid | 21 |
| 248 | Settlement idempotency race handling | 21 |
| 249 | Durable reconciliation run | 21 |
| 250 | Reconciliation finding upsert | 21 |
| 251 | Reconciliation idempotent replay | 21 |
| 252 | Operational alert severity ordering | 21 |
| 253 | Tenant-scoped reconciliation retry | 21 |
| 254 | Health/readiness evidence aggregation | 21 |
| 255 | Credential-free health response | 21 |
| 256 | Settings filter and sort allowlist | 21 |
| 257 | Audited settings transaction and cache invalidation | 21 |
| 258 | Staged feature-flag enforcement | 21 |
| 259 | Validated Redis cache-aside | 22 |
| 260 | Explicit Redis invalidation contract | 22 |
| 261 | Redis client lifecycle ownership | 22 |
| 262 | Queue-specific retry policy | 22 |
| 263 | Worker payload runtime validation | 22 |
| 264 | Queue name as a routing contract | 22 |
| 265 | Magic-byte upload validation | 22 |
| 266 | Malware scanner fail-closed boundary | 22 |
| 267 | Production scanner configuration gate | 22 |
| 268 | Tenant-prefixed private object key | 22 |
| 269 | Direct-upload finalize inspection | 22 |
| 270 | Tenant-scoped object lifecycle | 22 |
| 271 | Approved commerce-event mapping | 22 |
| 272 | Durable message deduplication | 22 |
| 273 | Allowlisted template rendering | 22 |
| 274 | Encrypted messaging credentials | 22 |
| 275 | Adapter registry readiness | 22 |
| 276 | Definitive-failure provider fallback | 22 |
| 277 | Firebase optional initialization boundary | 22 |
| 278 | Honest notification-provider gap | 22 |
| 279 | Immutable AsyncLocalStorage tenant context | 23 |
| 280 | Fail-loud tenant context access | 23 |
| 281 | Host-to-control-plane resolution boundary | 23 |
| 282 | Tenant database manager with bounded client cache | 23 |
| 283 | Bounded tenant fanout | 23 |
| 284 | Stamped tenant worker boundary | 23 |
| 285 | Membership guard cache with pub/sub invalidation | 23 |
| 286 | Tenant suspension commerce guard | 23 |
| 287 | Bounded retention sweep | 23 |
| 288 | Platform/tenant database split | 23 |
| 289 | Durable provisioning step journal | 23 |
| 290 | Organization creation versus tenant identity bootstrap | 23 |
| 291 | Secret-box credential storage | 23 |
| 292 | Time-bounded support access | 23 |
| 293 | Plan entitlement and usage enforcement | 23 |
| 294 | Domain readiness aggregate | 23 |
| 295 | Backup evidence freshness | 23 |
| 296 | Correlation-aware sanitized structured logging | 23 |
| 297 | Guard/decorator authorization composition | 23 |
| 298 | Disposable integration-test database evidence | 23 |

The remaining documents deliberately use recurring source paths rather than
pretending each feature is unique.

## Audit honesty

This is a source-guided learning curriculum, not a claim that every backend
file has been exhaustively audited. Coverage, checked source areas, and open
audit work are recorded in `PATTERN-AUDIT-SCOPE.md`.

Use `FULL-AUDIT-MATRIX.md` when converting this learning curriculum into a
file-by-file verification program.
