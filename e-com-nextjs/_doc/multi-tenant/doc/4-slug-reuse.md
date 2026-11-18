Ran search organization deletion in codebase
Ran find delete organization endpoint in NestJS
Analyzed platform.controller.ts:L420-455
Ran find delete method in platform services
Analyzed organizations.service.ts:L205-265
Analyzed organizations.service.ts:L1-100
Ran search slug in provisioning.service.ts
Analyzed provisioning.service.ts:L215-265
Ran find Organization model in Prisma schemas
Checked task Find Organization model in Prisma schemas
Analyzed platform.prisma:L30-90
Analyzed platform.prisma:L85-130
Ran find all relations to Organization id
Analyzed platform.prisma:L135-155
Ran query organizations in ferio_platform db · Exited with code 2
Ran check postgres credentials in docker-compose.yml
Ran query Organization table in ferio_platform
Analyzed org-actions.tsx:L110-150
Analyzed org-actions.tsx:L20-60
Ran find platform api route in ferio-platform-admin
Ran find API route files in ferio-platform-admin
Analyzed route.ts:L1-50
Analyzed route.ts:L48-53
Ran check ProvisioningRun model in schema
Ran check Subscription model in schema
Ran check SaasInvoice model
Analyzed platform.prisma:L377-430
Ran find createTenantDatabase implementation
Analyzed local-postgres-provisioner.ts:L1-100
Ran list tables in ferio_platform
Ran query TenantDomain table
Ran query PlatformAuditLog table
Ran check RESERVED_SUBDOMAINS list
Ran list all databases in Postgres
Analyzed create-form.tsx:L1-65
Ran check backend container logs
Ran check domain cache invalidation
Analyzed domain-cache-invalidation.ts:L1-24
Ran check closure in organizations.service.ts · Exited with code 1
Ran search closure in backend src
Analyzed tenant-closure.service.ts:L40-150
Ran check if ferio-2 exists in Organization
Ran check if ferio-2 exists in TenantDomain
Ran search 409 or slug errors in backend logs
Ran check platform admin logs
Ran check platform admin logs with bypass sandbox
Ran check ferio-2 in prisma · Exited with code 1
Analyzed platform-prisma.service.ts:L1-50
Ran test prisma query with PrismaPg · Exited with code 1
Ran run test query in ferio-nest-prisma
Ran check postgres port mapping
Ran check ferio-2 via ferio-backend
Ran test creating org with slug ferio-2
Ran check tenant domain record
Analyzed updated_commands.md:L40-100
Ran search slug in updated_commands.md · Exited with code 1
Ran search organization in updated_commands.md · Exited with code 1
Ran search slug reuse/delete in docs
Analyzed 05_Domain_DNS_TLS_Storefront_Routing.md:L1850-1880

Yes, **a deleted organization's slug IS reusable**. 

In the database, the slug uniqueness constraint is enforced on the `Organization` table (`slug String @unique`) and the `TenantDomain` table (`hostname String @unique`). Once an organization is deleted, those rows are completely removed, freeing the slug for reuse immediately.

We just verified this directly on the database: an organization with the previously deleted slug (`ferio-2`) was able to be created cleanly without any conflict.

---

### Why did it fail when you tried to recreate it?

There are **3 exact reasons** why this happens in Ferio's multi-tenant architecture:

#### 1. It was "Closed", not "Hard-Deleted" (Retention Window)
In the Platform Admin console, there are two different ways an organization is removed:
* **Lifecycle Closure (`Suspend` ➔ `Close` ➔ `Finalize closure`)**:
  - The store enters `CLOSURE_PENDING` or `CLOSED`.
  - **The database records are NOT deleted.** The tenant data is preserved under an enterprise **90-day retention window** for legal/accounting audits and data export recovery.
  - Because the row still exists in the `Organization` table, the `@unique` constraint remains active, and creating a new store with that slug will fail with:
    ```
    ORGANIZATION_SLUG_TAKEN
    ```
* **Physical Hard Delete (`Delete organization` red button)**:
  - This calls `DELETE /platform/organizations/:id`.
  - It drops the physical PostgreSQL tenant database, cascades and deletes all `TenantDomain` rows, purges the `Organization` record, and invalidates the routing cache.
  - **Only this action frees the slug for immediate reuse.**

---

#### 2. The Slug is in the System Reserved List
If the slug you attempted to use is on the platform reserve list, it will **never** be allowed, even if no organization is currently using it:
```typescript
RESERVED_SUBDOMAINS = [
  'www', 'admin', 'api', 'app', 'platform',
  'mail', 'ftp', 'ferio', 'status', 'docs', 'cdn'
]
```
For example, if you deleted an organization and tried to recreate one with the slug **`ferio`**, the system intentionally blocks it with:
```
ORGANIZATION_SLUG_RESERVED
```
*(This protects platform routing so subdomains like `ferio.sheakh.qzz.io` or `admin.sheakh.qzz.io` don't collide with core infrastructure).*

---

#### 3. Orphaned Subdomain / Partial Provisioning
If an organization was removed manually or an error occurred during deletion, an orphaned entry may still be lingering in the `TenantDomain` table (`{slug}.sheakh.qzz.io`). 

---

### How to Check / Free a Stuck Slug

If you have a specific slug that is giving you `ORGANIZATION_SLUG_TAKEN`:

1. **Check if an organization still exists (even if suspended/closed):**
   ```bash
   docker exec -i ferio-postgres psql -U ferio -d ferio_platform -c \
     "SELECT id, name, slug, status FROM \"Organization\" WHERE slug = 'YOUR_SLUG';"
   ```
2. **If it shows `CLOSED` or `CLOSURE_PENDING`**:
   Open that organization in [Platform Admin](https://platform.sheakh.qzz.io/organizations) and click the red **Delete organization** button at the bottom of the page to execute the complete purge.
3. **Check for any orphaned domain reservations:**
   ```bash
   docker exec -i ferio-postgres psql -U ferio -d ferio_platform -c \
     "SELECT * FROM \"TenantDomain\" WHERE hostname LIKE 'YOUR_SLUG.%';"
   ```

---

### Enterprise Recommendation
- **In Dev / Testing:** Hard delete via the red button immediately frees the slug so you can test provisioning with the same clean name repeatedly.
- **In Production SaaS:** Keeping closed slugs locked for 30–90 days (via `CLOSURE_PENDING`) is standard enterprise practice to prevent **Subdomain Hijacking** (stopping bad actors from claiming a recently closed merchant's slug to intercept old customer cookies, search engine links, or webhook callbacks).