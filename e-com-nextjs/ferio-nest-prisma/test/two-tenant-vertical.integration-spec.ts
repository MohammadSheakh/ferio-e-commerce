/**
 * CAPSTONE — Two-Tenant End-to-End Vertical Proof (MT-4/MT-5/MT-7 gates).
 *
 * Requires TEST_DATABASE_URL pointing at a disposable PostgreSQL server with
 * CREATE DATABASE rights (the CI postgres service container provides this).
 *
 * Proves, against REAL PostgreSQL, for two independently bootstrapped tenant
 * databases with deliberately IDENTICAL identifiers:
 *   1. the full commerce vertical works independently per tenant:
 *      category → product(+stock) → guest cart → checkout draft → COD order
 *      → staff confirmation consuming reservations;
 *   2. the SAME idempotency key succeeds independently in both tenants;
 *   3. an order placed in tenant A is invisible to tenant B by reference;
 *   4. reservation state stays tenant-local through confirmation;
 *   5. a guest-cart token minted in A resolves to nothing in B;
 *   6. a rider session in B cannot act on A's order.
 */
import { Pool } from 'pg';
import { NotFoundException } from '@nestjs/common';

import { TenantSchemaBootstrapper } from '../src/tenancy/tenant-schema.bootstrapper';
import { TenantDatabaseManager } from '../src/tenancy/tenant-database.manager';
import { TenantDbService } from '../src/tenancy/tenant-db.service';
import { encryptSecret } from '../src/platform/utils/secret-box';
import {
  runWithTenantContext,
  type TenantContext,
} from '../src/tenancy/tenant-context';

import { CatalogService } from '../src/features/catalog/catalog.service';
import { CartService } from '../src/features/cart/cart.service';
import { CheckoutService } from '../src/features/checkout/checkout.service';
import { OrderService } from '../src/features/order/order.service';
import { DeliveryPersonnelService } from '../src/features/delivery-personnel/delivery-personnel.service';

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
const conditionalDescribe = TEST_DATABASE_URL ? describe : describe.skip;

const CREDENTIAL_KEY = 'ci-platform-db-credential-key-at-least-32-chars';

function serverConfig() {
  const url = new URL(TEST_DATABASE_URL as string);
  return {
    host: url.hostname,
    port: Number(url.port || 5432),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
  };
}

async function createScratchDatabase(prefix: string): Promise<string> {
  const pool = new Pool({ ...serverConfig(), database: 'postgres', max: 1 });
  const dbName = `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await pool.query(`CREATE DATABASE "${dbName}"`);
  await pool.end();
  return dbName;
}

async function dropScratchDatabase(name: string): Promise<void> {
  const pool = new Pool({ ...serverConfig(), database: 'postgres', max: 1 });
  await pool.query(
    `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()`,
    [name],
  );
  await pool.query(`DROP DATABASE IF EXISTS "${name}"`);
  await pool.end();
}

function autoStub(): unknown {
  return new Proxy(
    {},
    {
      get: (_target, prop) => {
        if (prop === 'then') return undefined;
        return (..._args: unknown[]) => Promise.resolve({});
      },
    },
  );
}

const configStub = { get: (_key: string, fallback: unknown) => fallback };
const auditStub = { record: jest.fn().mockResolvedValue({}) };

conditionalDescribe('Two-Tenant End-to-End Vertical Proof', () => {
  jest.setTimeout(120_000);
  let bootstrapper: TenantSchemaBootstrapper;
  let manager: TenantDatabaseManager;
  let tenantDb: TenantDbService;
  const created: string[] = [];

  interface Material {
    id: string;
    host: string;
    port: number;
    databaseName: string;
    username: string;
    credentialCipher: string;
  }

  interface Tenant {
    dbName: string;
    conn: { host: string; port: number; user: string; password: string; database: string };
    material: Material;
    context: TenantContext;
    token: string;
    orderId: string;
    orderReference: string;
  }

  function materialFor(id: string, database: string): Material {
    return {
      id,
      host: serverConfig().host,
      port: serverConfig().port,
      databaseName: database,
      username: serverConfig().user,
      credentialCipher: encryptSecret(serverConfig().password, CREDENTIAL_KEY),
    };
  }

  function tenantFrom(dbName: string): Tenant {
    const conn = { ...serverConfig(), database: dbName };
    const material = materialFor(`tdb-${dbName.slice(-8)}`, dbName);
    const context = Object.freeze({
      organizationId: `org-${dbName}`,
      tenantDatabaseId: material.id,
      database: Object.freeze({ ...material }),
      domainId: 'dom-e2e',
      hostname: `${dbName}.ferio.test`,
      subscriptionStatus: 'ACTIVE' as const,
    }) as TenantContext;
    return { dbName, conn, material, context, token: '', orderId: '', orderReference: '' };
  }

  async function inTenant<T>(
    t: Tenant,
    fn: (db: PrismaClient) => Promise<T>,
  ): Promise<T> {
    return runWithTenantContext(t.context, async () => {
      await manager.getClient(t.material);
      return fn(await tenantDb.get());
    });
  }

  beforeAll(() => {
    process.env.PLATFORM_DB_CREDENTIAL_KEY = CREDENTIAL_KEY;
    process.env.TENANT_DB_MAX_CLIENTS = '10';
    bootstrapper = new TenantSchemaBootstrapper();
    manager = new TenantDatabaseManager();
    tenantDb = new TenantDbService(manager);
  });

  afterAll(async () => {
    // Release pooled tenant connections BEFORE terminating/dropping the
    // scratch databases, otherwise backends are killed mid-idle (57P01).
    await manager.onModuleDestroy();
    for (const name of created) {
      await dropScratchDatabase(name).catch(() => undefined);
    }
  });

  it(
    'runs catalog → cart → checkout → COD order → confirmation per tenant and proves cross-tenant impossibility',
    async () => {
      // ── Provision two scratch tenants through the canonical path ──
      const dbA = await createScratchDatabase('ferio_vt_a');
      const dbB = await createScratchDatabase('ferio_vt_b');
      created.push(dbA, dbB);
      const tA = tenantFrom(dbA);
      const tB = tenantFrom(dbB);
      await bootstrapper.bootstrap(tA.conn);
      await bootstrapper.bootstrap(tB.conn);
      await bootstrapper.seedBaseline({ ...tA.conn, organizationName: 'Tenant A' });
      await bootstrapper.seedBaseline({ ...tB.conn, organizationName: 'Tenant B' });

      // Seed a delivery zone + district so preview can resolve shipping.
      for (const conn of [tA.conn, tB.conn]) {
        const pool = new Pool({ ...conn, max: 1 });
        await pool.query(
          `INSERT INTO "DeliveryZone" ("id", "name", "deliveryFee", "freeDeliveryThreshold", "isActive", "createdAt", "updatedAt")
           VALUES ('zone-dhaka', 'Dhaka Zone', 60, 100000, true, now(), now())
           ON CONFLICT ("id") DO NOTHING`
        );
        await pool.query(
          `INSERT INTO "DeliveryZoneDistrict" ("id", "zoneId", "name", "normalizedName", "createdAt", "updatedAt")
           VALUES ('dzd-dhaka', 'zone-dhaka', 'Dhaka', 'dhaka', now(), now())
           ON CONFLICT ("id") DO NOTHING`
        );
        await pool.end();
      }

      // Shared service instances: tenant resolution is ambient per call.
      const catalog = new CatalogService({} as never, auditStub as never, tenantDb);
      const carts = new CartService({} as never, configStub as never, tenantDb);
      const checkout = new CheckoutService({} as never, carts, auditStub as never, configStub as never, tenantDb);
      const orders = new OrderService(
        {} as never,
        carts,
        autoStub() as never,
        auditStub as never,
        configStub as never,
        autoStub() as never,
        autoStub() as never,
        tenantDb,
      );
      const riders = new DeliveryPersonnelService({} as never, auditStub as never, tenantDb);

      const adminActor = {
        userId: 'admin-e2e',
        email: 'admin@ferio.test',
        role: 'admin',
      };

      // ── Identical catalog seeded into BOTH tenants ──
      for (const tenant of [tA, tB]) {
        await inTenant(tenant, async () => {
          const category = await catalog.createCategory(
            { name: 'Shared Category' } as never,
            adminActor as never,
          );
          await catalog.createProduct(
            {
              name: 'Shared Product',
              description: 'Identical product seeded into every tenant',
              categoryId: category.id,
              status: 'ACTIVE',
              publishedAt: new Date(),
              variants: [
                { sku: 'SKU-SHARED', name: 'Default', price: 150000, initialStock: 5 },
              ],
            } as never,
            adminActor as never,
          );
        });
      }

      // ── Guest carts: independent tokens per tenant ──
      for (const tenant of [tA, tB]) {
        await inTenant(tenant, async () => {
          const variant = await (
            await tenantDb.get()
          ).productVariant.findFirstOrThrow({
            select: { id: true },
          });
          const added = await carts.addItem(
            { variantId: variant.id, quantity: 2 },
            undefined,
          );
          tenant.token = added.cartToken!;
        });
      }
      expect(tA.token).toBeTruthy();
      expect(tB.token).toBeTruthy();

      // ── Checkout drafts from identical inputs ──
      for (const tenant of [tA, tB]) {
        await inTenant(tenant, () =>
          checkout.preview(
            {
              name: 'E2E Customer',
              phone: '01712345678',
              district: 'Dhaka',
              area: 'Gulshan',
              detailedAddress: 'House 1, Road 1',
              paymentMethod: 'COD',
              termsAccepted: true,
            } as never,
            tenant.token,
          ),
        );
      }

      // ── Place COD orders with the SAME idempotency key ──
      for (const tenant of [tA, tB]) {
        await inTenant(tenant, async () => {
          const confirmation = await orders.placeOrder(
            'COD',
            tenant.token,
            'IDEM-SHARED-ACROSS-TENANTS-0123456789',
            adminActor as never,
          );
          tenant.orderReference = confirmation.reference;
          tenant.orderId = confirmation.id;
        });
      }
      expect(tA.orderId).not.toBe(tB.orderId);

      // ── Cross-tenant impossibility: references cannot leak ──
      const poolA = new Pool({ ...tA.conn, max: 1 });
      const poolB = new Pool({ ...tB.conn, max: 1 });
      try {
        const refInB = await poolB.query(
          `SELECT id FROM "Order" WHERE reference = $1`,
          [tA.orderReference],
        );
        const refInA = await poolA.query(
          `SELECT id FROM "Order" WHERE reference = $1`,
          [tB.orderReference],
        );
        expect(refInB.rowCount).toBe(0);
        expect(refInA.rowCount).toBe(0);

        // Confirmation in A reserves ONLY A's stock (COD policy ALWAYS keeps
        // placement unreserved; confirmation mints the active reservation).
        // Must run inside A's tenant context — no ambient scope here.
        await inTenant(tA, () =>
          orders.confirmOrder(tA.orderId, {} as never, adminActor as never),
        );

        const reservedAfter = await poolA.query(
          `SELECT COALESCE(SUM("reserved"),0)::int AS r FROM "InventoryStock"`,
        );
        const reservedAfterB = await poolB.query(
          `SELECT COALESCE(SUM("reserved"),0)::int AS r FROM "InventoryStock"`,
        );

        // A's reservation state stays tenant-local: B remains at zero even
        // though both tenants seeded identical catalog identifiers.
        expect(reservedAfter.rows[0].r).toBe(2);
        expect(reservedAfterB.rows[0].r).toBe(0);

        // ── Guest-cart token scoping: A's token is meaningless in B ──
        const foreignCart = await inTenant(tB, () => carts.getCart(tA.token));
        expect((foreignCart as { id?: string | null }).id ?? null).toBeNull();

        // ── Rider in B cannot act on A's order ──
        await expect(
          inTenant(tB, () =>
            riders.updateDeliveryOrderStatus('rider-B', tA.orderId, {
              status: 'DELIVERED',
            } as never),
          ),
        ).rejects.toBeInstanceOf(NotFoundException);
      } finally {
        await Promise.all([poolA.end(), poolB.end()]);
      }
    },
    300_000,
  );
});
