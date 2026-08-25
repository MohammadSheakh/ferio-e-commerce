/**
 * Cross-tenant wallet financial isolation proof (MT-7 §10.7 / MT-13 matrix).
 *
 * Requires TEST_DATABASE_URL with CREATE DATABASE rights. Proves, against
 * REAL PostgreSQL, for two independently bootstrapped tenant databases with
 * deliberately IDENTICAL identifiers:
 *   1. top-up request → review → credit stays inside the resolved tenant;
 *   2. an order debit consumes ONLY that tenant's wallet balance;
 *   3. replaying tenant A's order reference against tenant B's wallet
 *      fails closed (no over-crediting path across databases);
 *   4. idempotency keys are tenant-local — the same key succeeds
 *      independently in both tenants without collision;
 *   5. ledger rows written in one tenant are invisible to the other.
 */
import { Pool } from 'pg';
import { ConflictException } from '@nestjs/common';

import { TenantSchemaBootstrapper } from '../src/tenancy/tenant-schema.bootstrapper';
import { TenantDatabaseManager } from '../src/tenancy/tenant-database.manager';
import { TenantDbService } from '../src/tenancy/tenant-db.service';
import { encryptSecret } from '../src/platform/utils/secret-box';
import {
  runWithTenantContext,
  type TenantContext,
} from '../src/tenancy/tenant-context';

import { WalletService } from '../src/features/wallet/wallet.service';
import type { PrismaClient } from '@prisma/client';

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

const auditStub = { record: jest.fn().mockResolvedValue({}) };
const notificationsStub = { create: jest.fn().mockResolvedValue({}) };
const adminActor = {
  userId: 'admin-e2e',
  email: 'admin@ferio.test',
  role: 'admin',
};

conditionalDescribe('Cross-tenant wallet financial isolation', () => {
  jest.setTimeout(120_000);
  let bootstrapper: TenantSchemaBootstrapper;
  let manager: TenantDatabaseManager;
  let tenantDb: TenantDbService;
  let wallets: WalletService;
  const created: string[] = [];

  interface Tenant {
    dbName: string;
    conn: { host: string; port: number; user: string; password: string; database: string };
    context: TenantContext;
  }

  function tenantFrom(dbName: string): Tenant {
    const conn = { ...serverConfig(), database: dbName };
    const material = {
      id: `tdb-${dbName.slice(-8)}`,
      host: conn.host,
      port: conn.port,
      databaseName: dbName,
      username: conn.user,
      credentialCipher: encryptSecret(conn.password, CREDENTIAL_KEY),
    };
    const context = Object.freeze({
      organizationId: `org-${dbName}`,
      tenantDatabaseId: material.id,
      database: Object.freeze({ ...material }),
      domainId: 'dom-wallet',
      hostname: `${dbName}.ferio.test`,
      subscriptionStatus: 'ACTIVE' as const,
    }) as TenantContext;
    return { dbName, conn, context };
  }

  async function inTenant<T>(
    t: Tenant,
    fn: (db: PrismaClient) => Promise<T>,
  ): Promise<T> {
    return runWithTenantContext(t.context, async () => {
      await manager.getClient(t.context.database as never);
      return fn(await tenantDb.get());
    });
  }

  beforeAll(() => {
    process.env.PLATFORM_DB_CREDENTIAL_KEY = CREDENTIAL_KEY;
    process.env.TENANT_DB_MAX_CLIENTS = '10';
    bootstrapper = new TenantSchemaBootstrapper();
    manager = new TenantDatabaseManager();
    tenantDb = new TenantDbService(manager);
    wallets = new WalletService(
      {} as never,
      auditStub as never,
      notificationsStub as never,
      tenantDb,
    );
  });

  afterAll(async () => {
    await manager.onModuleDestroy();
    for (const name of created) {
      await dropScratchDatabase(name).catch(() => undefined);
    }
  });

  it(
    'keeps top-ups, debits, refunds and idempotency keys tenant-local',
    async () => {
      const dbA = await createScratchDatabase('ferio_wa_a');
      const dbB = await createScratchDatabase('ferio_wa_b');
      created.push(dbA, dbB);
      const tA = tenantFrom(dbA);
      const tB = tenantFrom(dbB);
      await bootstrapper.bootstrap(tA.conn);
      await bootstrapper.bootstrap(tB.conn);

      // Identical account identifiers seeded into BOTH tenants.
      for (const tenant of [tA, tB]) {
        await inTenant(tenant, async (db) => {
          const zone = await db.deliveryZone.create({
            data: { id: 'zone-shared-1', name: 'Wallet Zone', deliveryFee: 0 },
          });
          const cart = await db.cart.create({
            data: {
              tokenHash: `hash-cart-${tenant.dbName}`,
              expiresAt: new Date(Date.now() + 3_600_000),
            },
          });
          await db.customer.create({
            data: {
              id: 'shared-customer-1',
              name: 'Shared Customer',
              phoneOriginal: '01700000000',
              phoneNormalized: '+88017000000000',
              email: 'shared@ferio.test',
              orders: {
                create: {
                  id: 'order-shared-1',
                  reference: 'FER-SHARED-0001',
                  idempotencyKeyHash: `hash-order-${tenant.dbName}`,
                  subtotal: 40_000,
                  deliveryFee: 0,
                  total: 40_000,
                  checkoutDraft: {
                    create: {
                      name: 'Shared Customer',
                      phoneOriginal: '01700000000',
                      phoneNormalized: '+88017000000000',
                      district: 'Dhaka',
                      area: 'Gulshan',
                      detailedAddress: 'House 1, Road 1',
                      termsAccepted: true,
                      subtotal: 40_000,
                      deliveryFee: 0,
                      total: 40_000,
                      expiresAt: new Date(Date.now() + 3_600_000),
                      cartId: cart.id,
                      deliveryZoneId: zone.id,
                    },
                  },
                },
              },
            },
          });
          await db.user.create({
            data: {
              id: 'shared-user-1',
              name: 'Shared Customer',
              email: 'shared@ferio.test',
              password: 'not-a-real-hash',
              role: 'user',
              customerId: 'shared-customer-1',
            },
          });
        });
      }

      // ── Tenant A funds its wallet through the review workflow ──
      const topUpA = await inTenant(tA, () =>
        wallets.requestTopUp(
          'shared-user-1',
          {
            provider: 'BKASH',
            amount: 100_000,
            customerReference: 'TOPUP-REF-A1',
          } as never,
          'wallet-topup-idempotency-key-shared-0001',
        ),
      );
      expect(topUpA.status).toBe('PENDING_REVIEW');

      await inTenant(tA, () =>
        wallets.reviewTopUp(
          topUpA.id,
          { status: 'COMPLETED', reviewNote: 'verified' } as never,
          adminActor as never,
        ),
      );
      const summaryA = await inTenant(tA, () => wallets.summary('shared-user-1'));
      expect(summaryA.wallet.balance).toBe(100_000);

      // ── Tenant B resolves the SAME identifiers to its OWN wallet ──
      const summaryB = await inTenant(tB, () => wallets.summary('shared-user-1'));
      expect(summaryB.wallet.balance).toBe(0);
      expect(summaryB.wallet.id).not.toBe(summaryA.wallet.id);

      // ── Order debit in A consumes only A's balance ──
      await inTenant(tA, (db) =>
        db.$transaction((tx) =>
          wallets.debitOrder(tx, 'shared-user-1', 'order-shared-1', 40_000),
        ),
      );
      const afterDebitA = await inTenant(tA, () => wallets.summary('shared-user-1'));
      expect(afterDebitA.wallet.balance).toBe(60_000);
      expect(
        afterDebitA.transactions.filter((entry) => entry.orderId === 'order-shared-1'),
      ).toHaveLength(1);

      // B's ledger is untouched by A's debit.
      const afterDebitB = await inTenant(tB, () => wallets.summary('shared-user-1'));
      expect(afterDebitB.wallet.balance).toBe(0);
      expect(afterDebitB.transactions).toHaveLength(0);

      // ── Negative: replaying A's order refund against B fails closed ──
      await expect(
        inTenant(tB, (db) =>
          db.$transaction((tx) =>
            wallets.refundCancelledOrder(tx, 'shared-customer-1', 'order-shared-1', 40_000),
          ),
        ),
      ).rejects.toBeInstanceOf(ConflictException);

      // Refund inside A credits only A.
      await inTenant(tA, (db) =>
        db.$transaction((tx) =>
          wallets.refundCancelledOrder(tx, 'shared-customer-1', 'order-shared-1', 40_000),
        ),
      );
      const afterRefundA = await inTenant(tA, () => wallets.summary('shared-user-1'));
      expect(afterRefundA.wallet.balance).toBe(100_000);
      const afterRefundB = await inTenant(tB, () => wallets.summary('shared-user-1'));
      expect(afterRefundB.wallet.balance).toBe(0);

      // ── Idempotency keys are tenant-local: same key succeeds in B ──
      const topUpB = await inTenant(tB, () =>
        wallets.requestTopUp(
          'shared-user-1',
          {
            provider: 'BKASH',
            amount: 55_000,
            customerReference: 'TOPUP-REF-B1',
          } as never,
          'wallet-topup-idempotency-key-shared-0001',
        ),
      );
      expect(topUpB.id).not.toBe(topUpA.id);
      await inTenant(tB, () =>
        wallets.reviewTopUp(
          topUpB.id,
          { status: 'COMPLETED', reviewNote: 'verified' } as never,
          adminActor as never,
        ),
      );
      const finalB = await inTenant(tB, () => wallets.summary('shared-user-1'));
      expect(finalB.wallet.balance).toBe(55_000);
      expect(finalB.topUps).toHaveLength(1);

      // Ledger visibility remains strictly per-database.
      const finalA = await inTenant(tA, () => wallets.summary('shared-user-1'));
      const aReferences = finalA.transactions.map((t) => t.amount);
      expect(aReferences).toEqual([40_000, 40_000, 100_000]); // refund, debit, top-up credit
      expect(finalB.transactions.map((t) => t.amount)).toEqual([55_000]);
      expect(finalA.wallet.totalCredited).toBe(140_000); // top-up + refund credit
      expect(finalB.wallet.totalCredited).toBe(55_000);
    },
    300_000,
  );
});
