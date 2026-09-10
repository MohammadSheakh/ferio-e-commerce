Question : what are the plans should be for this saas

Answers : Yes. Looking at the actual Ferio PRD, I would **not** price this like a simple POS or website builder. Ferio is already much closer to a **Commerce Operating System / Shopify-style SaaS for Bangladesh**: isolated tenant DB, storefront, admin, inventory, COD, payments, courier, returns, wallet, customer app, rider operations, CRM/marketing later, reporting, etc. 

The PRD itself intentionally leaves exact pricing/limits open for product-owner approval.  So this is the plan structure I would ship.

### Ferio pricing I would use

|                            |               **Starter** |            **Business** ⭐ |                   **Pro** |   **Enterprise** |
| -------------------------- | ------------------------: | ------------------------: | ------------------------: | ---------------: |
| Monthly                    |                  **৳990** |                **৳2,490** |                **৳4,990** |           Custom |
| Annual                     |                **৳9,900** |               **৳24,900** |               **৳49,900** |           Custom |
| Products                   |                       250 |                     2,000 |                    10,000 |           Custom |
| Orders/month               |                       300 |                     2,000 |                    10,000 |           Custom |
| Staff                      |                         2 |                         5 |                        15 |           Custom |
| Warehouse                  |                         1 |                         1 |                        3* |           Custom |
| Storage                    |                      2 GB |                     10 GB |                     30 GB |           Custom |
| Ferio subdomain            |                         ✓ |                         ✓ |                         ✓ |                ✓ |
| Custom domain              |                         — |                         ✓ |                         ✓ |                ✓ |
| Storefront                 |                         ✓ |                         ✓ |                         ✓ |                ✓ |
| Mobile customer experience |                         ✓ |                         ✓ |                         ✓ |                ✓ |
| COD                        |                         ✓ |                         ✓ |                         ✓ |                ✓ |
| Online payment             |                         ✓ |                         ✓ |                         ✓ |                ✓ |
| Inventory                  |                         ✓ |                         ✓ |                         ✓ |                ✓ |
| Courier                    |                         1 |                  Multiple |                  Multiple |         Multiple |
| Returns/RTO                |                         ✓ |                         ✓ |                         ✓ |                ✓ |
| Basic reports              |                         ✓ |                         ✓ |                         ✓ |                ✓ |
| Advanced reports           |                         — |                         ✓ |                         ✓ |                ✓ |
| Customer wallet            |                         — |                         ✓ |                         ✓ |                ✓ |
| Store pickup               |                         — |                         ✓ |                         ✓ |                ✓ |
| Warranty/service           |                         — |                         ✓ |                         ✓ |                ✓ |
| Support chat               |                         — |                         ✓ |                         ✓ |                ✓ |
| Rider management           |                         — |                         — |                         ✓ |                ✓ |
| Live rider tracking        |                         — |                         — |                         ✓ |                ✓ |
| Customer 360               |                         — |                   Limited |                         ✓ |                ✓ |
| CRM                        |                         — |                     Basic |                         ✓ |                ✓ |
| Campaigns                  |                         — |                         — |                         ✓ |                ✓ |
| Automation                 |                         — |                         — |                         ✓ |                ✓ |
| API/Webhooks               |                         — |                         — |                         ✓ |                ✓ |
| Priority support           |                         — |                         ✓ |                         ✓ |        Dedicated |
| DB placement               | Shared infra, isolated DB | Shared infra, isolated DB | Shared infra, isolated DB | Dedicated option |

`*` Multi-warehouse should only become sellable when you've actually shipped it—the PRD currently treats additional warehouses as later capability. 

## 1. Starter — ৳990/month

This should target Facebook/Instagram sellers who have outgrown Excel/Google Sheets but aren't a large operation.

Don't cripple the actual commerce engine. Give them storefront, product/catalog, inventory, order management, COD, payments, one courier, basic customer records, returns/RTO and basic reporting.

That aligns with Ferio's core promise around reliable commerce and especially Bangladesh COD operations. 

I would **not charge transaction commission**.

So:

> **৳990/month + 0% platform transaction fee**

Payment gateway/courier fees are obviously separate.

That's a strong sales message.

---

## 2. Business — ৳2,490/month

This should be the plan you actually want most customers to buy.

I'd literally mark it:

**BUSINESS — Most Popular**

The buyer is now running a real online business rather than merely experimenting.

Unlock things like wallet, multiple couriers, custom domain, more staff, advanced reporting, warranty/service, pickup, support chat and some Customer 360 capability.

These aren't imaginary features—your current PRD explicitly has wallet, warranty, service booking, support chat, pickup and related customer functionality in approved scope. 

At **৳2,490/month**, the argument becomes:

> If Ferio saves you a few failed/RTO orders or several hours of staff work per month, it has already paid for itself.

---

## 3. Pro — ৳4,990/month

This is where I would put the features that genuinely create operating leverage.

For example:

**CRM + Customer 360 + segmentation + campaigns + automation + rider management + live location + API/webhooks + larger limits.**

Your PRD's Release 2 already specifically calls for Customer 360, leads/CRM, segments, campaigns, automation and WhatsApp/SMS/email reporting. 

And you've gone much further on first-party delivery: approved riders can receive tenant orders, update delivery state and send GPS information, while Admin can see the live map. 

That makes Pro substantially different from Business rather than simply:

> Business but with more products.

That's important.

---

## 4. Enterprise — Don't publish a fixed price initially

I'd use:

> **Contact Sales — starting around ৳15,000/month**

Enterprise is where infrastructure/service guarantees change:

dedicated DB placement if necessary, very high order/product limits, many staff, multiple warehouses, custom integrations, API/webhooks, migration assistance, priority support, restore requirements and potentially SLA agreements.

Your architecture is actually prepared for this because every tenant already has an independent database and your roadmap explicitly anticipates enterprise DB placement and restore targets. 

---

# I would also give a 14-day free trial

Not a permanent Free plan.

```text
14-day trial
No credit card required

          ↓

Starter
৳990/mo

Business
৳2,490/mo

Pro
৳4,990/mo

Enterprise
Custom
```

A forever-free plan gives you exactly the customers you don't particularly want while **every Ferio tenant costs you something**: database, connections, storage, backups, jobs, logs and support.

That's especially relevant because your architecture isn't just rows with `tenantId`; every organization has an isolated operational database. The PRD requires bounded DB connections, migrations, tenant-specific backup/restore and retention through suspension/cancellation. 

So I'd offer a generous **trial**, not free hosting forever.

---

# One thing I would change from the earlier plan discussion

I previously leaned toward **Starter / Business / Pro / Enterprise**, and after reading the current 2.1 PRD I still think that's correct.

But I would **not aggressively gate the core commerce features**.

For example, don't do:

> Starter can't use returns
> Starter can't use COD verification
> Starter can't manage inventory
> Starter doesn't get audit logs

Those are part of making Ferio reliable, not premium luxuries.

Your own requirements say plan enforcement is supposed to be centralized, upgrades should unlock functionality without reprovisioning, and hitting limits must never delete/corrupt existing data. 

So monetize mainly through three things:

**Scale →** orders, products, staff, storage, warehouses.

**Growth →** CRM, automation, advanced analytics, API.

**Operational sophistication →** riders, multi-warehouse, advanced integrations, enterprise infrastructure/support.

That will make your plans much easier for customers to understand.

### One more important decision: don't hardcode these numbers

Even if we settle on these prices, your database should effectively contain:

```text
Plan
 ├─ STARTER
 ├─ BUSINESS
 ├─ PRO
 └─ ENTERPRISE

PlanVersion
 ├─ priceMonthly
 ├─ priceAnnual
 └─ effectiveFrom

Entitlement
 ├─ MAX_PRODUCTS
 ├─ MAX_MONTHLY_ORDERS
 ├─ MAX_STAFF
 ├─ MAX_STORAGE_GB
 ├─ MAX_WAREHOUSES
 ├─ CUSTOM_DOMAIN
 ├─ ADVANCED_REPORTING
 ├─ CRM
 ├─ AUTOMATION
 ├─ RIDER_MANAGEMENT
 ├─ API_ACCESS
 └─ ...
```

Your PRD already explicitly requires plans/entitlements to be versionable rather than scattering hard-coded plan names through commerce modules. 

That means six months from now you can make **Business ৳2,990 for new customers while grandfathering existing ৳2,490 customers**, without rewriting your application.

For Bangladesh launch, **৳990 → ৳2,490 → ৳4,990 → Enterprise** is the pricing ladder I'd start testing with real merchants. I wouldn't consider these final forever prices until you have the first 10–20 paying tenants and know your actual support + infrastructure cost per tenant.
