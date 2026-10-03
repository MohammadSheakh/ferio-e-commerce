# Ferio Commerce — Enterprise Multi-Tenant Commerce SaaS Platform

[![CI Pipeline](https://github.com/MohammadSheakh/ferio-e-commerce/actions/workflows/ci.yml/badge.svg)](https://github.com/MohammadSheakh/ferio-e-commerce/actions/workflows/ci.yml)
[![Node.js Version](https://img.shields.io/badge/Node.js-20.x%20LTS-339933?logo=nodedotjs)](https://nodejs.org/)
[![pnpm Version](https://img.shields.io/badge/pnpm-9.x-F69220?logo=pnpm)](https://pnpm.io/)
[![Next.js Version](https://img.shields.io/badge/Next.js-14.2%20App%20Router-black?logo=nextdotjs)](https://nextjs.org/)
[![NestJS Version](https://img.shields.io/badge/NestJS-11.x-E0234E?logo=nestjs)](https://nestjs.com/)
[![Prisma Version](https://img.shields.io/badge/Prisma-7.8-2D3748?logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7.x-DC382D?logo=redis)](https://redis.io/)
[![Expo](https://img.shields.io/badge/Expo-54%20(React%20Native%200.81)-000020?logo=expo)](https://expo.dev/)
[![Docker](https://img.shields.io/badge/Docker-Compose%20v2-2496ED?logo=docker)](https://www.docker.com/)

---

## Executive Summary

**Ferio Commerce** is a Bangladesh-first, enterprise-grade, multi-tenant Commerce Software-as-a-Service (SaaS) platform. Designed as a high-throughput, high-integrity modular monolith backend serving modern distributed client surfaces, Ferio allows independent businesses to instantly subscribe, provision isolated branded digital storefronts, and manage end-to-end commerce operations from cataloging to hyper-localized fulfillment, courier integrations, automated reconciliation, and CRM.

Ferio adheres to a **Database-per-Tenant physical isolation architecture** ([ADR-0001](e-com-nextjs/_doc/multi-tenant/adr/ADR-0001-database-per-tenant.md)), ensuring strict data confidentiality, cryptographic boundary protection, independent database maintenance, and tenant portability without the risk of cross-tenant query leaks.

---

## Architectural Highlights

- **Physical Multi-Tenancy**: Control-plane database (`ferio_platform`) manages subscriptions, plans, domains, and tenant registries; each tenant operates within its own dedicated PostgreSQL database (`ferio_dev` / production tenant databases).
- **Zero-Trust Tenant Resolution**: Host-based resolution via `TenantResolverService` and Node.js `AsyncLocalStorage`, with multi-tiered Redis caching (positive & negative hits) and CIDR-restricted reverse proxy validation.
- **Dynamic Bounded Connection Pools**: Custom `TenantDatabaseManager` with connection budgets, LRU eviction, and automatic connection reclamation preventing connection exhaustion.
- **Strict OpenAPI Contract Drift Gates**: End-to-end type safety between the NestJS backend and Next.js / Expo clients enforced through compile-time and CI schema checks.
- **Hyper-Localized Bangladesh Commerce Stack**:
  - **Payment Gateways**: Native adapters for bKash, Nagad, Rocket, Upay, SSLCommerz, and robust Cash-on-Delivery (COD) lifecycle management.
  - **Courier Logistics**: Integrated API delivery pipelines with Steadfast, Pathao, RedX, and Paperfly with automated background status polling, webhook event ingestion, and Return-to-Origin (RTO) dispute handling.
  - **Regional Addressing & Fraud Prevention**: 64-district geo-coverage matrix, Thana/Upazila zoning, phone-number-first authentication, and predictive RTO scoring.
- **Event-Driven Asynchronous Pipeline**: Background workers powered by BullMQ and Redis for transactional SMS/WhatsApp/email messaging, courier tracking sweeps, payment timeouts, and scheduled reconciliation.
- **Real-Time Collaboration**: Real-time Socket.IO multi-room cluster with Redis pub/sub adapter for live delivery map tracking, staff chat, and immediate order status broadcasts.

---

## System Architecture

```mermaid
flowchart TB
    subgraph Clients["Client Applications & Edge Ingress"]
        CW["Customer Web<br/>(Next.js 14 App Router)<br/>Port :3000"]
        MA["Mobile App<br/>(Expo 54 / React Native)<br/>iOS & Android"]
        AD["Tenant Admin Portal<br/>(Next.js 14 App Router)<br/>Port :3001"]
        PA["Platform Admin Console<br/>(Next.js 14 App Router)<br/>Port :3100"]
    end

    subgraph Edge["Edge / Reverse Proxy Tier"]
        RP["Reverse Proxy / Cloudflare Tunnel<br/>(TLS Termination, Host Header Normalization)"]
    end

    subgraph BackendCore["Ferio Core Backend (NestJS 11 Modular Monolith) :6733"]
        MW["TenantContextMiddleware<br/>(Host Resolver & AsyncLocalStorage)"]
        
        subgraph ControlPlane["Control Plane (/api/v1/platform/*)"]
            PAuth["Platform Auth & RBAC"]
            PProv["Tenant Provisioning Engine"]
            PBilling["Subscription & Plan Enforcer"]
            PMigrate["Fleet Migration Orchestrator"]
            PHealth["System & Tenant Health Probes"]
        end

        subgraph TenantPlane["Tenant Plane (/api/v1/*)"]
            Catalog["Catalog & Inventory"]
            Cart["Persistent Cart & Session"]
            Checkout["Checkout & COD Engine"]
            Orders["Order State Machine"]
            Payments["Commerce Payments (bKash/Nagad)"]
            Shipping["Logistics (Steadfast/Pathao)"]
            Returns["Returns, Refunds & RTO"]
            CRM["Customer CRM & Retention"]
            Staff["Staff Access & Audit"]
        end

        subgraph RealtimeWorkers["Realtime & Async Engine"]
            Sock["Socket.IO Gateway :6734<br/>(Ticket Auth & Tenant Rooms)"]
            Queues["BullMQ Queues & Workers<br/>(Messaging, Polling, Sweep)"]
        end
    end

    subgraph DataTier["Data & Storage Infrastructure"]
        PlatformDB[("Control Plane DB<br/>PostgreSQL 16 (ferio_platform)")]
        TenantDB1[("Tenant DB Alpha<br/>PostgreSQL 16")]
        TenantDBN[("Tenant DB N...<br/>PostgreSQL 16")]
        RedisCluster[("Redis 7<br/>(Cache, Sessions, Queues, Pub/Sub)")]
        S3Storage[("Object Storage<br/>(MinIO / Cloudflare R2)")]
    end

    CW --> Edge
    MA --> Edge
    AD --> Edge
    PA --> Edge

    Edge --> MW

    MW -- "Platform Routes" --> ControlPlane
    MW -- "Tenant Domain / Context" --> TenantPlane

    ControlPlane --> PlatformDB
    TenantPlane --> TenantDB1
    TenantPlane --> TenantDBN

    TenantPlane --> Queues
    TenantPlane --> Sock
    Queues --> RedisCluster
    Sock --> RedisCluster
    TenantPlane --> S3Storage
```

---

## Monorepo Anatomy

The repository organizes core backend services, web applications, mobile packages, documentation, and infrastructure into a unified workspace:

```text
.
├── .github/
│   └── workflows/
│       └── ci.yml                     # Enterprise CI/CD pipeline (typecheck, lint, test, drift)
├── .codex/                            # Canonical system maps and engineering context
│   ├── PROJECT_CONTEXT.md             # Repository navigation map
│   ├── backend-context.md             # NestJS and tenancy architecture rules
│   ├── frontend-context.md            # Next.js design system & contract rules
│   └── operations-context.md          # Deployment, backup, and runtime policies
├── e-com-nextjs/
│   ├── _doc/                          # Comprehensive PRDs, ADRs, runbooks, and diagrams
│   │   ├── multi-tenant/
│   │   │   ├── Ferio-Commerce-SaaS-PRD-v2.1.md  # Definitive product requirement specification
│   │   │   ├── adr/                             # Architecture Decision Records (ADR 0001 - 0007)
│   │   │   └── project-flow/                    # In-depth architectural execution guides
│   │   └── design-language.md                   # Ferio visual language and UI token principles
│   │
│   ├── ferio-nest-prisma/             # Core Backend Application (NestJS 11 + Prisma 7)
│   │   ├── prisma/
│   │   │   ├── schema.prisma          # Tenant database schema & migrations
│   │   │   └── platform.prisma        # Control plane database schema & migrations
│   │   ├── src/
│   │   │   ├── core/                  # Security filters, logging, DB wrappers, errors
│   │   │   ├── platform/              # SaaS Control Plane services, controllers, DTOs
│   │   │   ├── tenancy/               # Dynamic connection manager, resolver, guards
│   │   │   └── features/              # 35 isolated domain feature modules
│   │   └── scripts/                   # Verification gates, migration auditors, backup tools
│   │
│   ├── ferio-customer-web/            # Tenant Customer Storefront (Next.js 14 App Router)
│   │   ├── app/                       # Catalog, Product Details, Cart, Checkout, Order Tracking
│   │   └── lib/                       # Auto-generated typed API clients (`api-schema.ts`)
│   │
│   ├── ferio-admin-dashboard/
│   │   └── ferio-admin/               # Tenant Merchant Back Office (Next.js 14 App Router)
│   │       ├── app/dashboard/         # 33 Operational modules (Orders, Inventory, Logistics, CRM)
│   │       └── lib/                   # Typed API contracts and BFF integration routes
│   │
│   ├── ferio-platform-admin/          # SaaS Platform Operator Console (Next.js 14 App Router)
│   │   └── app/                       # Organizations, Subscriptions, Plans, Migrations, Health
│   │
│   ├── ferio-mobile-expo54/           # Customer Mobile Application (Expo SDK 54 / React Native)
│   │   └── app/                       # Tabs, native checkout, order tracking, push notifications
│   │
│   ├── docker-compose.yml             # Full-stack developer compose (Infra + all apps)
│   ├── docker-compose.infra.yml       # Infrastructure-only compose (Postgres, Redis, MinIO)
│   ├── docker-compose.production.yml  # Hardened production container orchestrator
│   └── init-db.sql                    # Initial database bootstrapper (ferio_dev, ferio_platform)
└── readme.md                          # Repository root documentation (this file)
```

---

## Core Domain Modules Breakdown

The backend contains 35 modular domain boundaries inside `src/features/` and dedicated platform modules:

| Domain Module | Key Responsibilities & Capabilities |
|---|---|
| **`catalog`** | Product catalog, multi-attribute variants, category hierarchies, brand registries, price matrices, and publication states. |
| **`cart`** | Guest & authenticated cart sessions, optimistic stock reservations, coupon applications, and cart merging. |
| **`checkout`** | Multi-step recoverable checkout drafts, server-authoritative price recalculation, delivery fee estimation, and COD gates. |
| **`order`** | Immutable order state transitions (`PENDING` → `CONFIRMED` → `PACKED` → `SHIPPED` → `DELIVERED` / `CANCELLED`), order histories, and audit records. |
| **`commerce-payments`** | Prepaid provider integrations (bKash, Nagad), payment attempt lifecycle, recovery sweeps, and transaction signatures. |
| **`shipping`** | Courier integration hub (Steadfast, Pathao, RedX, Paperfly), consignment booking, label generation, and automated polling. |
| **`returns` & `refunds`** | Customer-initiated return requests, quality inspection workflows, reverse courier dispatch, and refund adjustments. |
| **`rto`** | Dedicated Return-to-Origin tracking, delivery failure classification, merchant inventory restock, and courier penalty claims. |
| **`reconciliation`** | Financial reconciliation between courier remittances, payment gateway disbursements, bank payouts, and order ledger entries. |
| **`settlements` & `reports`** | Daily merchant settlement statements, profit & loss, delivered-order economics, discount absorption, and exportable CSVs. |
| **`customers` (CRM)** | Customer profiles, lifetime value (LTV), RFM segmentation (Recency, Frequency, Monetary), order histories, and note feeds. |
| **`delivery-personnel`** | In-house rider fleet dispatch, parcel handover barcodes, route assignment, and proof-of-delivery (POD) capture. |
| **`storefront-analytics`** | Privacy-conscious session metrics, conversion funnels, category view counts, search keyword trends, and abandoned cart alerts. |
| **`transactional-messaging`** | Outbox-pattern notification engine with rate limiting for SMS (bulk Bangladesh gateways), WhatsApp Business, and transactional email. |
| **`socket-gateway` & `chat`**| Real-time bi-directional messaging, customer-to-merchant support threads, live shipment location tracking, and presence rooms. |
| **`platform`** | Multi-tenant control plane: automated database provisioning, tenant lifecycle, canary migration execution, and global audit evidence. |

---

## Multi-Tenancy & Data Isolation Model

```mermaid
sequenceDiagram
    autonumber
    actor User as Client (Browser / Mobile)
    participant RP as Ingress / Edge Proxy
    participant MW as TenantContextMiddleware
    participant Resolver as TenantResolverService
    participant Cache as Redis Cache
    participant CP as Control Plane DB (ferio_platform)
    participant TDM as TenantDatabaseManager
    participant TDB as Tenant Database (ferio_dev / tenant_xyz)

    User->>RP: HTTP GET https://store1.ferio.local/api/v1/catalog/products
    RP->>MW: Forward with Host: store1.ferio.local
    MW->>Resolver: Resolve effective host
    Resolver->>Cache: Lookup host in Redis
    alt Cache Hit
        Cache-->>Resolver: Return cached tenant context
    else Cache Miss
        Resolver->>CP: Query TenantDomain + Organization + Subscription
        CP-->>Resolver: Tenant metadata & DB credentials
        Resolver->>Cache: Cache positive mapping (60s TTL)
    end

    Resolver->>MW: Instantiate immutable TenantContext (AsyncLocalStorage)
    MW->>TDM: Acquire tenant Prisma client
    TDM->>TDB: Run query inside scoped tenant pool
    TDB-->>TDM: Query result
    TDM-->>MW: Formatted DTO
    MW-->>User: HTTP 200 OK (Domain payload isolated to store1)
```

### Tenancy Invariants
1. **No Shared Schema Pollution**: Under no circumstances do multiple organizations share a PostgreSQL database table without physical or logical isolation.
2. **Fail-Closed Resolution**: If a hostname does not map to an active, valid subscription with a migrated database, the request fails with `404 Not Found` or `402 Payment Required`.
3. **Database URL Protection**: Clients can never specify or override target databases via headers, query parameters, or request payloads.
4. **Platform vs Tenant Separation**: Platform administrators authenticate against dedicated platform credentials and JWT secrets; tenant staff authenticate strictly within their resolved tenant organization.

---

## Technology Stack & Versions

| Layer | Technologies & Dependencies | Version | Purpose |
|---|---|---|---|
| **Runtime & Language** | Node.js, TypeScript | Node 20 LTS, TS 5.7+ | Consistent enterprise runtime across all services |
| **Package Manager** | pnpm | 9.x | Strict deterministic workspace lockfile |
| **Backend Framework** | NestJS | 11.0.x | Modular monolith architecture, DI, validation pipes |
| **ORM & Database** | Prisma ORM, PostgreSQL | Prisma 7.8, PostgreSQL 16 | Dual schema management (`schema.prisma`, `platform.prisma`) |
| **Caching & Queues** | Redis, BullMQ, ioredis | Redis 7, BullMQ 5.76+ | High-throughput distributed cache, job queues, Socket adapter |
| **Realtime Engine** | Socket.IO | 4.8.x | WebSockets with ticket authentication and presence |
| **Object Storage** | AWS S3 SDK, MinIO, Cloudflare R2 | AWS SDK v3 | Pre-signed upload strategy for product assets & invoices |
| **Storefront Web** | Next.js, React, Tailwind CSS | Next 14.2, React 18.3 | Server-rendered, SEO-optimized tenant storefront |
| **Admin Dashboards** | Next.js, React, Tailwind CSS | Next 14.2, React 18.3 | High-productivity dashboards with server-only BFF pattern |
| **Mobile Client** | Expo SDK, React Native, React | Expo 54, RN 0.81, React 19 | Cross-platform iOS & Android mobile shopping experience |
| **Containerization** | Docker, Docker Compose | Engine 24+, Compose v2 | Containerized micro-services and production overlays |

---

## Local Development & Setup Runbook

### Prerequisites
Ensure the host development system has the following tools installed:
- **Node.js**: `v20.x` (LTS)
- **pnpm**: `v9.x` (`corepack enable && corepack prepare pnpm@latest --activate`)
- **Docker & Docker Compose**: Docker Engine 24+ and Docker Compose v2.20+
- **OpenSSL**: For generating cryptographic platform secrets

---

### Execution Modes

#### Mode A: Full-Stack in Docker (Demo / Review / Single Server)
Spins up all infrastructure components, automated migrations, MinIO storage, the NestJS backend, and all three Next.js web applications in a coordinated Docker network.

```bash
cd e-com-nextjs
docker compose up -d --build
```

**Automated Boot Sequence:**
1. Spawns PostgreSQL 16 on port `5433` (mapped to internal `5432` to avoid host PostgreSQL conflicts).
2. Spawns Redis 7 on port `6379`.
3. Spawns MinIO on ports `9000` (API) and `9001` (Web Console), creating the default `ferio-media` bucket.
4. Executes one-shot migration containers: `tenant-migrate` and `platform-migrate`.
5. Backend auto-generates cryptographic keys inside the `ferio_secrets` persistent volume.
6. Boots the Backend and all three web applications.

**Service Port Allocations:**
| Surface | Local URL | Default Credentials / Context |
|---|---|---|
| **Backend API** | `http://localhost:6733/api/v1` | Health: `GET /api/v1/health` |
| **Customer Storefront** | `http://localhost:3000` | Public storefront demo |
| **Tenant Admin Portal** | `http://localhost:3001` | Merchant back office |
| **Platform Admin** | `http://localhost:3100` | Login: `owner@ferio.local` |
| **MinIO Console** | `http://localhost:9001` | User: `minioadmin` / Pass: `minioadmin` |

To stop the full stack:
```bash
docker compose down          # Stop containers (preserves database volumes)
docker compose down -v       # Stop containers and wipe all database volumes
```

---

#### Mode B: Native Development (Recommended for Engineers)
Runs infrastructure dependencies (PostgreSQL, Redis, MinIO) in Docker while running the applications natively with instant hot reloading.

**1. Start Infrastructure Containers:**
```bash
cd e-com-nextjs
docker compose -f docker-compose.infra.yml up -d
```

**2. Configure Backend Environment:**
Create `e-com-nextjs/ferio-nest-prisma/.env`:
```env
PORT=6733
SOCKET_PORT=6734
DATABASE_URL=postgresql://ferio:ferio@localhost:5433/ferio_dev
PLATFORM_DATABASE_URL=postgresql://ferio:ferio@localhost:5433/ferio_platform
REDIS_HOST=localhost
REDIS_PORT=6379

FILE_UPLOAD_STRATEGY=r2
R2_ENDPOINT=http://localhost:9000
R2_BUCKET=ferio-media
R2_ACCESS_KEY_ID=minioadmin
R2_SECRET_ACCESS_KEY=minioadmin

JWT_ACCESS_SECRET=c3a4f910e53a478b87198a2871b69f8892185a6cf17f7d49826315ef982c7a91
JWT_REFRESH_SECRET=7f910e53a478b87198a2871b69f8892185a6cf17f7d49826315ef982c7a91c3a4
PLATFORM_JWT_SECRET=478b87198a2871b69f8892185a6cf17f7d49826315ef982c7a91c3a4f910e53a
PLATFORM_DB_CREDENTIAL_KEY=8a2871b69f8892185a6cf17f7d49826315ef982c7a91c3a4f910e53a478b8719
PLATFORM_CALLBACK_SECRET=185a6cf17f7d49826315ef982c7a91c3a4f910e53a478b87198a2871b69f8892

TENANCY_ENABLED=false
```

**3. Initialize Database Schemas:**
```bash
cd e-com-nextjs/ferio-nest-prisma
pnpm install
pnpm prisma:generate              # Generates both tenant & platform Prisma clients
pnpm prisma:migrate:deploy        # Applies canonical tenant schema
pnpm prisma:migrate:platform      # Applies platform control plane schema
pnpm prisma:seed                  # (Optional) Populates dev seeds
```

**4. Start Applications in Separate Terminals:**
```bash
# Terminal 1: Backend API
cd e-com-nextjs/ferio-nest-prisma && pnpm start:dev

# Terminal 2: Customer Storefront (:3000)
cd e-com-nextjs/ferio-customer-web && pnpm dev

# Terminal 3: Tenant Admin Back Office (:3001)
cd e-com-nextjs/ferio-admin-dashboard/ferio-admin && pnpm dev

# Terminal 4: Platform Control Plane (:3100)
cd e-com-nextjs/ferio-platform-admin && pnpm dev

# Terminal 5: Customer Mobile (Expo)
cd e-com-nextjs/ferio-mobile-expo54 && pnpm start
```

---

## Environment Variables Reference

### Backend (`ferio-nest-prisma/.env`)
| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | Yes | `6733` | REST API listening port |
| `SOCKET_PORT` | Yes | `6734` | Dedicated WebSocket / Socket.IO port |
| `DATABASE_URL` | Yes | - | Default tenant PostgreSQL connection string |
| `PLATFORM_DATABASE_URL` | Yes | - | SaaS Control Plane PostgreSQL connection string |
| `REDIS_HOST` | Yes | `localhost` | Redis instance hostname |
| `REDIS_PORT` | Yes | `6379` | Redis instance port |
| `TENANCY_ENABLED` | Yes | `false` | Enable strict host-based multi-tenant resolution |
| `TENANT_TRUSTED_PROXY_CIDRS`| No | `127.0.0.1/32` | Allowed CIDRs for client `x-forwarded-host` trust |
| `JWT_ACCESS_SECRET` | Yes | - | 48-byte hex secret for tenant access tokens |
| `JWT_REFRESH_SECRET` | Yes | - | 48-byte hex secret for tenant refresh tokens |
| `PLATFORM_JWT_SECRET` | Yes | - | 48-byte hex secret for platform superadmin tokens |
| `PLATFORM_DB_CREDENTIAL_KEY`| Yes | - | 32-byte AES key for tenant DB password encryption |
| `PLATFORM_CALLBACK_SECRET` | Yes | - | Secret for internal platform webhooks |
| `FILE_UPLOAD_STRATEGY` | Yes | `r2` | Storage engine (`r2` or `local`) |
| `R2_ENDPOINT` | Conditional | - | MinIO or Cloudflare R2 S3 API URL |
| `R2_BUCKET` | Conditional | `ferio-media` | Target media bucket name |

---

## Verification, Testing & Quality Gates

Ferio employs strict CI/CD quality gates that must pass on every pull request:

```bash
cd e-com-nextjs/ferio-nest-prisma

# 1. Typecheck the entire application including specs
pnpm exec tsc --noEmit -p tsconfig.json

# 2. Run unit test suites (648+ tests across 143 suites)
pnpm test

# 3. Run cross-tenant database isolation integration tests
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ferio_ci_test pnpm test:integration

# 4. BullMQ background queue runtime smoke tests
pnpm test:queue-smoke

# 5. Architecture & context boundary verification
pnpm architecture:check
pnpm check:tenant-context-boundaries
pnpm check:connection-budget

# 6. Database migration integrity & compatibility check
pnpm check:migrations
pnpm check:migration-compatibility

# 7. OpenAPI contract drift detection
pnpm openapi:export
pnpm openapi:check
```

### Frontend Drift Checks
Both `ferio-customer-web` and `ferio-admin-dashboard` validate their TypeScript API client against backend contracts:
```bash
cd e-com-nextjs/ferio-customer-web && pnpm api:check
cd e-com-nextjs/ferio-admin-dashboard/ferio-admin && pnpm api:check
```

---

## Security, Compliance & Production Hardening

- **Database-per-Tenant Isolation ([ADR-0001](e-com-nextjs/_doc/multi-tenant/adr/ADR-0001-database-per-tenant.md))**: Prevents data co-mingling at the storage layer. Queries execute only against the authenticated organization's dedicated connection pool.
- **Tenant Credential Cryptography**: Tenant database connection credentials stored in `ferio_platform` are encrypted using `AES-256-GCM` via `PLATFORM_DB_CREDENTIAL_KEY`.
- **Anti-Drift API Envelopes**: The backend exports its OpenAPI schema to `openapi.json`. Web clients fail CI if schema changes are uncommitted or break backward compatibility.
- **Header Sanitization & Spoof Prevention**: Ingress reverse proxies strip client-supplied `x-forwarded-host` unless originated from authorized `TENANT_TRUSTED_PROXY_CIDRS`.
- **Secure Token Storage**: Client sessions use server-only `HttpOnly`, `SameSite=Lax`, and `Secure` cookies for refresh tokens. Raw tokens are never exposed in JavaScript contexts.
- **Database Connection Budgets**: Strict pool caps (`TENANT_DB_POOL_MAX=3`, `TENANT_DB_MAX_CLIENTS=25`) protect the PostgreSQL cluster from connection starvation during traffic spikes.
- **Automated Backup & DR Policy**: Zero-data-loss runbooks specifying Point-In-Time-Recovery (PITR), daily logical backups, RPO < 60 minutes, and RTO < 240 minutes ([Runbook Documentation](e-com-nextjs/_doc/multi-tenant/runbooks/backup-restore.md)).

---

## Production Deployment Runbook

### Hardened Production Compose
For single-node or orchestrator deployments:

```bash
cd e-com-nextjs
docker compose -f docker-compose.production.yml up -d --build
```

**Key Production Settings:**
1. Enable `TENANCY_ENABLED=true`.
2. Configure wildcard DNS (`*.ferio.com`) pointing to the ingress reverse proxy.
3. Configure Cloudflare Tunnel / NGINX with TLS termination and pass host headers.
4. Mount `ferio_secrets` or inject production secrets via HashiCorp Vault / AWS Secrets Manager.
5. Set `BACKUP_PROVIDER=managed-postgresql` and ensure WAL archiving is operational.

---

## Product Roadmap & Milestones

- [x] **Release 1.0 — Core Multi-Tenant Commerce Engine**:
  - Modular monolith backend with tenant isolation.
  - Next.js customer web storefront with COD checkout.
  - Merchant admin back-office with product, inventory, and order fulfillment.
  - Steadfast & Pathao courier integrations.
- [x] **Release 1.5 — Platform Control Plane & Realtime**:
  - Platform superadmin console for tenant provisioning & plan management.
  - Socket.IO gateway with Redis pub/sub.
  - Multi-channel transactional notifications (SMS/WhatsApp/Email).
  - Automated canary migration orchestrator.
- [x] **Release 2.0 — Cross-Platform Mobile & Financial Integrity**:
  - Expo 54 native mobile application.
  - Automated courier COD remittance reconciliation.
  - Return-to-Origin (RTO) analytics and fraud prevention.
- [ ] **Release 2.5 — Advanced Omnichannel & Multi-Warehouse**:
  - Multi-warehouse inventory routing per tenant.
  - Automated dynamic courier routing based on delivery success rates.
  - POS offline synchronization for brick-and-mortar storefronts.

---

## Canonical Documentation Index

For detailed architectural specifications, consult the documents in `e-com-nextjs/_doc/`:

| Document | Description |
|---|---|
| [System Map & Learning Path](e-com-nextjs/_doc/multi-tenant/project-flow/01-system-map-and-learning-path.md) | Architectural entry point and component lifecycle |
| [HTTP Request Lifecycle](e-com-nextjs/_doc/multi-tenant/project-flow/02-http-request-lifecycle.md) | Middleware, DTO transformation, and guard execution sequence |
| [Tenant Resolution & DB Routing](e-com-nextjs/_doc/multi-tenant/project-flow/03-multi-tenant-resolution-and-database-routing.md) | Host matching, caching, and connection management |
| [Authentication & Authorization](e-com-nextjs/_doc/multi-tenant/project-flow/04-authentication-and-authorization.md) | Dual-realm identity architecture (Platform vs Tenant) |
| [Tenant Commerce Flow](e-com-nextjs/_doc/multi-tenant/project-flow/06-tenant-commerce-flow.md) | Complete journey from catalog browsing to order fulfillment |
| [Async Workers & Messaging](e-com-nextjs/_doc/multi-tenant/project-flow/07-async-workers-and-integrations.md) | BullMQ queue architecture, courier webhooks, and retry policies |
| [Backup & Disaster Recovery](e-com-nextjs/_doc/multi-tenant/runbooks/backup-restore.md) | Database backup, PITR, verification, and tenant restore runbooks |
| [Architecture Decision Records](e-com-nextjs/_doc/multi-tenant/adr/README.md) | ADR register (ADR-0001 through ADR-0007) |

---

## Contributing & Development Governance

1. **Architecture Boundaries**: Keep platform admin, tenant admin, customer web, mobile app, and backend responsibilities strictly decoupled.
2. **Database Protection**: Never allow client-supplied input to dictate database connections or bypass `TenantContextMiddleware`.
3. **OpenAPI Integrity**: Always run `pnpm openapi:export` in the backend after changing controller endpoints or DTOs, and verify web client schemas via `pnpm api:check`.
4. **Test Verification**: Ensure all unit (`pnpm test`) and isolation integration tests (`pnpm test:integration`) pass before submitting pull requests.

---

## License & Ownership

Copyright © 2026 Mohammad Sheakh. All rights reserved.
Proprietary software for Ferio Commerce SaaS. Unauthorized copying, modification, or distribution is strictly prohibited.
