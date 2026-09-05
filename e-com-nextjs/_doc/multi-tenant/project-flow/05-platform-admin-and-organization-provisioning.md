# 5. Platform Admin And Organization Provisioning

The Platform Admin controls the SaaS control plane. It does not use a tenant
database for ordinary platform operations.

## Platform Admin Request

```text
POST /api/v1/platform/auth/login
  -> PlatformAuthService
  -> PlatformPrismaService
  -> platform JWT with platform realm

GET/POST /api/v1/platform/*
  -> ThrottlerGuard
  -> PlatformAuthGuard
  -> PlatformPermissions
  -> platform service
  -> control-plane PostgreSQL
```

The platform module is global because many infrastructure services need its
registry client, but the control-plane services remain independent of tenant
commerce models.

## Create An Organization

The Platform Admin submits:

```text
POST /api/v1/platform/organizations
{
  "name": "Business name",
  "slug": "store-slug",
  "ownerEmail": "owner@example.com"
}
```

`OrganizationsService.create()`:

1. normalizes the slug;
2. creates the organization in `PROVISIONING` state;
3. creates the initial owner membership in the control plane;
4. records a platform audit event;
5. returns the organization metadata.

This step does not yet mean the tenant can serve traffic.

## Provision The Tenant

`POST /api/v1/platform/organizations/:id/provision` starts an idempotent
`ProvisioningRun`. The current sequence is:

```text
1. RESERVE_SUBDOMAIN
2. REGISTER_TENANT_DATABASE
3. PROVISION_PHYSICAL_DATABASE
4. APPLY_MIGRATIONS
5. SEED_TENANT
6. ATTACH_OWNER_MEMBERSHIP
7. HEALTH_CHECK
8. ACTIVATE_ORGANIZATION
```

### Step 1: Reserve subdomain

`DomainsService` creates the active hostname mapping, such as
`store.ferio.local` or the configured production domain. The hostname is later
the tenant resolver's routing key.

### Step 2 and 3: Register/provision database

The pluggable `TENANT_DB_PROVISIONER` creates or registers the physical
PostgreSQL database. Local development uses `LocalPostgresProvisioner`; a
managed database implementation can replace it without changing the
orchestration state machine.

Credentials are encrypted in the control-plane registry. The plaintext
password is not stored in the tenant context or returned to the browser.

### Step 4: Apply migrations

`TenantSchemaBootstrapper` applies the canonical tenant migration artifact set
and records the schema version in `TenantDatabase`.

### Step 5: Seed tenant baseline

The bootstrapper seeds baseline tenant settings and required initial values.
Platform plan/entitlement seeds are separate control-plane data.

### Step 6: Owner membership

The owner membership was created during organization creation. This step records
that the prerequisite is present for the provisioning evidence trail.

### Step 7: Health check

The registry is marked ready only after the tenant database can be reached and
has the expected schema state.

### Step 8: Activate

The organization transitions from `PROVISIONING` to `ACTIVE`. Only after this
point can host resolution return a ready tenant database.

## Retry And Failure

Provisioning uses an idempotency key. Repeating the same request resumes the
existing run rather than creating a second domain/database. A failed run is
marked `PROVISIONING_FAILED`, records the failed step, and can be resumed.

Organization transitions are explicit:

```text
PROVISIONING -> ACTIVE | PROVISIONING_FAILED
PROVISIONING_FAILED -> PROVISIONING
ACTIVE -> SUSPENDED | CLOSURE_PENDING
SUSPENDED -> ACTIVE | CLOSURE_PENDING
CLOSURE_PENDING -> CLOSED | ARCHIVED | SUSPENDED
CLOSED -> ARCHIVED
```

## Plans, Subscriptions, And Entitlements

Platform Admin plan operations write control-plane `Plan` and entitlement
records. A tenant subscription points to a plan. Tenant requests can ask
`/api/v1/tenancy/my-plan` for the current effective plan.

At a commerce mutation boundary, the plan gate checks:

1. organization lifecycle and subscription state;
2. feature entitlement enabled/disabled;
3. usage against a configured limit;
4. stable denial code when access is not allowed.

Usage counters are control-plane records. Commerce facts remain in the tenant
database, and reconciliation compares authoritative tenant facts with recorded
counters.

## Closure And Migrations

Platform Admin can initiate/finalize closure, create migration runs, pause or
resume them, and inspect provisioning/database health. These operations are
control-plane workflows and must be audited. Tenant traffic is rejected or
restricted according to the organization/database lifecycle state.

