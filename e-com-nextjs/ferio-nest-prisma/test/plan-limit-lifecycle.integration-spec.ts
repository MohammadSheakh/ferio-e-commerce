/**
 * MT-6 gate — one tenant's plan-limit lifecycle against REAL PostgreSQL.
 *
 * Wires the REAL EntitlementsService + UsageService (control-plane state
 * held in an in-memory double, since the platform database itself is not
 * part of this harness) into a REAL OrderService running against a
 * bootstrapped scratch tenant database, then proves:
 *   1. placement succeeds while usage is under the plan limit;
 *   2. hitting the limit denies further placement server-side with the
 *      stable PLAN_LIMIT_REACHED code and creates NO partial order;
 *   3. upgrading the plan unlocks capability WITHOUT touching tenant data;
 *   4. downgrading blocks again while every historical order survives
 *      intact (§9.2 data-preservation requirement).
 */
import { Pool } from 'pg';
import { ForbiddenException } from '@nestjs/common';

import { TenantSchemaBootstrapper } from '../src/tenancy/tenant-schema.bootstrapper';
import { TenantDatabaseManager } from '../src/tenancy/tenant-database.manager';
import { TenantDbService } from '../src/tenancy/tenant-db.service';
import { encryptSecret } from '../src/platform/utils/secret-box';
import {
  runWithTenantContext,
  type TenantContext,
} from '../src/tenancy/tenant-context';

import { EntitlementsService } from '../src/platform/services/entitlements.service';
import { UsageService } from '../src/platform/services/usage.service';
import { CartService } from '../src/features/cart/cart.service';
import { CheckoutService } from '../src/features/checkout/checkout.service';
import { OrderService } from '../src/features/order/order.service';

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
const conditionalDescribe = TEST_DATABASE_URL ? describe : describe.skip;

const CREDENTIAL_KEY = 'ci-platform-db-credential-key-at-least-32-chars';
const ORG_ID = 'org-plan-test';

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

/** In-memory control-plane double: subscription row + usage counters. */
function fakePlatform() {
  let subscription: any = {
    id: 'sub-1',
    organizationId: ORG_ID,
    status: 'ACTIVE',
    planId: 'plan-starter',
    plan: {
      id: 'plan-starter',
      key: 'starter',
      displayName: 'Starter',
      entitlements: [
        { featureKey: 'orders_per_month', enabled: true, limit: 2 },
        { featureKey: 'products_max', enabled: true, limit: 500 },
      ],
    },
  };
  const counters = new Map<string, bigint>();
  const keyOf = (w: { organizationId_metric_periodKey: Record<string, string> }) =>
    Object.values(w.organizationId_metric_periodKey).join(':');
  return {
    client: {
      subscription: {
        findUnique: jest.fn().mockImplementation(() =>
          Promise.resolve(subscription ? JSON.parse(JSON.stringify(subscription)) : null),
        ),
      },
      usageCounter: {
        upsert: jest.fn().mockImplementation(({ where, create, update }: any) => {
          const k = keyOf(where);
          if (!counters.has(k)) counters.set(k, create.value);
          else if (typeof update.value === 'bigint') counters.set(k, update.value);
          else if (update.value?.increment !== undefined)
            counters.set(k, counters.get(k)! + update.value.increment);
          return Promise.resolve({ value: counters.get(k)! });
        }),
        findUnique: jest.fn().mockImplementation(({ where }: any) =>
          Promise.resolve(
            counters.has(keyOf(where)) ? { value: counters.get(keyOf(where))! } : null,
          ),
        ),
      },
    },
    setPlan(planId: string, limit: number) {
      subscription = {
        ...subscription,
        planId,
        plan: {
          ...subscription.plan,
          id: planId,
          key: planId,
          entitlements: [{ featureKey: 'orders_per_month', enabled: true, limit }],
        },
      };
    },
    usageValue(): bigint {
      for (const [k, v] of counters.entries()) {
        if (k.includes('orders_per_month')) return v;
      }
      return BigInt(0);
    },
  };
}

conditionalDescribe('MT-6 gate: plan-limit lifecycle on one real tenant', () => {
  jest.setTimeout(180_000);

  it('enforces the limit, unlocks on upgrade, preserves data on downgrade', async () => {
    process.env.PLATFORM_DB_CREDENTIAL_KEY = CREDENTIAL_KEY;
    process.env.TENANT_DB_MAX_CLIENTS = '10';
    const bootstrapper = new TenantSchemaBootstrapper();
    const manager = new TenantDatabaseManager();
    const tenantDb = new TenantDbService(manager);

    const dbName = await createScratchDatabase('ferio_plan_a');
    const conn = { ...serverConfig(), database: dbName };
    try {
      await bootstrapper.bootstrap(conn);

      const material = {
        id: `tdb-${dbName.slice(-8)}`,
        host: conn.host,
        port: conn.port,
        databaseName: dbName,
        username: conn.user,
        credentialCipher: encryptSecret(conn.password, CREDENTIAL_KEY),
      };
      const context = Object.freeze({
        organizationId: ORG_ID,
        tenantDatabaseId: material.id,
        database: Object.freeze({ ...material }),
        domainId: 'dom-plan',
        hostname: 'plan-test.ferio.test',
        subscriptionStatus: 'ACTIVE' as const,
      }) as TenantContext;

      const control = fakePlatform();
      const usage = new UsageService(control as never);
      const entitlements = new EntitlementsService(control as never, usage);
      const configStub = { get: (_k: string, fb: unknown) => fb };
      const auditStub = { record: jest.fn().mockResolvedValue({}) };
      const notificationsStub = { notifyCustomer: jest.fn().mockResolvedValue({}) };

      const carts = new CartService({} as never, configStub as never, tenantDb);
      const checkout = new CheckoutService(
        {} as never,
        carts,
        auditStub as never,
        configStub as never,
        tenantDb,
      );
      const messagesAuto = new Proxy({}, { get: () => () => Promise.resolve({}) });
      const orders = new OrderService(
        {} as never,
        carts,
        messagesAuto as never,
        auditStub as never,
        configStub as never,
        {} as never,
        notificationsStub as never,
        tenantDb,
        entitlements,
        usage,
      );

      // Published product + finite stock + Dhaka delivery zone.
      const variantId = await runWithTenantContext(context, async () => {
        const db = await tenantDb.get();
        const zone = await db.deliveryZone.create({
          data: {
            id: 'zone-plan',
            name: 'Plan Zone',
            deliveryFee: 0,
            freeDeliveryThreshold: 1_000_000,
            isActive: true,
          },
        });
        await db.deliveryZoneDistrict.create({
          data: {
            id: 'dzd-plan-dhaka',
            zoneId: zone.id,
            name: 'Dhaka',
            normalizedName: 'dhaka',
          },
        });
        const category = await db.category.create({
          data: { name: 'Plan Category', slug: 'plan-category' },
        });
        const product = await db.product.create({
          data: {
            name: 'Plan Product',
            slug: 'plan-product',
            description: 'MT-6 gate fixture',
            status: 'ACTIVE',
            publishedAt: new Date(Date.now() - 60_000),
            categoryId: category.id,
          },
        });
        const variant = await db.productVariant.create({
          data: { name: 'Default', sku: 'PLAN-SKU-1', price: 10_000, productId: product.id },
        });
        const warehouse = await db.warehouse.create({
          data: { code: 'PLAN-WH', name: 'Plan Warehouse' },
        });
        await db.inventoryStock.create({
          data: { warehouseId: warehouse.id, variantId: variant.id, onHand: 25 },
        });
        return variant.id;
      });

      let sequence = 0;
      const placeOne = async (): Promise<string> => {
        sequence += 1;
        return runWithTenantContext(context, async () => {
          const added = await carts.addItem({ variantId, quantity: 1 }, undefined);
          const token = added.cartToken!;
          await checkout.preview(
            {
              name: 'Plan Customer',
              phone: '01712345678',
              district: 'Dhaka',
              area: 'Gulshan',
              detailedAddress: 'House 1, Road 1',
              paymentMethod: 'COD',
              termsAccepted: true,
            } as never,
            token,
          );
          const confirmation = await orders.placeOrder(
            'COD',
            token,
            `plan-gate-idempotency-key-${String(sequence).padStart(4, '0')}`,
          );
          return confirmation.id;
        });
      };

      // ── Under the limit: two placements succeed, metered in real time ──
      const firstId = await placeOne();
      const secondId = await placeOne();
      expect(firstId).toBeTruthy();
      expect(secondId).not.toBe(firstId);
      expect(control.usageValue()).toBe(BigInt(2));

      // ── Third placement hits the STARTER limit (2/month) ──
      await expect(placeOne()).rejects.toThrow('PLAN_LIMIT_REACHED');
      const countAtDenial = await runWithTenantContext(context, async () => {
        const db = await tenantDb.get();
        return db.order.count();
      });
      expect(countAtDenial).toBe(2); // no partial state

      // ── Upgrade to BUSINESS: capability unlocks without data changes ──
      control.setPlan('plan-business', 1000);
      const thirdId = await placeOne();
      expect(thirdId).toBeTruthy();
      const afterUpgrade = await runWithTenantContext(context, async () => {
        const db = await tenantDb.get();
        return db.order.findMany({
          orderBy: { createdAt: 'asc' },
          select: { id: true },
        });
      });
      expect(afterUpgrade.map((o) => o.id)).toEqual([firstId, secondId, thirdId]);

      // ── Downgrade back to STARTER: blocked again, history preserved ──
      control.setPlan('plan-starter', 2);
      await expect(placeOne()).rejects.toThrow('PLAN_LIMIT_REACHED');
      const finalOrders = await runWithTenantContext(context, async () => {
        const db = await tenantDb.get();
        return db.order.findMany({ select: { id: true }, orderBy: { createdAt: 'asc' } });
      });
      expect(finalOrders.map((o) => o.id)).toEqual([firstId, secondId, thirdId]);
    } finally {
      await manager.onModuleDestroy();
      await dropScratchDatabase(dbName).catch(() => undefined);
    }
  });
});
