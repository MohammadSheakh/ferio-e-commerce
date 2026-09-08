import {
  getTenantContext,
  runWithTenantContext,
} from '../../../tenancy/context/tenant-context';
import { WalletService } from '../wallet.service';

describe('WalletService tenant isolation', () => {
  const originalTenancy = process.env.TENANCY_ENABLED;

  afterEach(() => {
    if (originalTenancy === undefined) delete process.env.TENANCY_ENABLED;
    else process.env.TENANCY_ENABLED = originalTenancy;
  });

  function context(organizationId: string, databaseName: string) {
    return {
      correlationId: `correlation-${organizationId}`,
      organizationId,
      tenantDatabaseId: `database-${organizationId}`,
      database: {
        id: `database-${organizationId}`,
        host: 'localhost',
        port: 5432,
        databaseName,
        username: 'tenant',
        credentialCipher: 'encrypted',
      },
      domainId: `domain-${organizationId}`,
      hostname: `${organizationId}.ferio.test`,
      subscriptionStatus: 'ACTIVE' as const,
    };
  }

  function walletClient(walletId: string, amount: number) {
    const transaction = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'same-customer-id',
          role: 'user',
          isDeleted: false,
          walletId,
        }),
        update: jest.fn(),
      },
      wallet: {
        findUnique: jest.fn().mockResolvedValue({
          id: walletId,
          amount,
          totalBalance: amount,
          currency: 'bdt',
          status: 'active',
          isDeleted: false,
        }),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    };
    return {
      ...transaction,
      $transaction: jest.fn((callback: (tx: typeof transaction) => unknown) =>
        callback(transaction),
      ),
      walletTransactionHistory: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: `ledger-${walletId}`,
            type: 'credit',
            amount,
            balanceBefore: 0,
            balanceAfter: amount,
            description: `Tenant wallet ${walletId}`,
            status: 'completed',
            referenceFor: 'WalletTopUp',
            orderId: null,
            topUpId: `topup-${walletId}`,
            createdAt: new Date('2026-09-01T00:00:00.000Z'),
          },
        ]),
        count: jest.fn().mockResolvedValue(1),
      },
      walletTopUp: { findMany: jest.fn().mockResolvedValue([]) },
    };
  }

  it('keeps identical customer IDs and wallet records isolated by tenant', async () => {
    process.env.TENANCY_ENABLED = 'true';
    const tenantA = walletClient('wallet-a', 10_000);
    const tenantB = walletClient('wallet-b', 90_000);
    const tenantDb = {
      getOrLegacy: jest.fn(() =>
        getTenantContext().database.databaseName === 'tenant_a'
          ? tenantA
          : tenantB,
      ),
    };
    const service = new WalletService(
      {} as never,
      { record: jest.fn() } as never,
      { create: jest.fn() } as never,
      tenantDb as never,
    );

    const summaryA = await runWithTenantContext(
      context('org-a', 'tenant_a'),
      () => service.summary('same-customer-id'),
    );
    const summaryB = await runWithTenantContext(
      context('org-b', 'tenant_b'),
      () => service.summary('same-customer-id'),
    );

    expect(summaryA.wallet).toMatchObject({ id: 'wallet-a', balance: 10_000 });
    expect(summaryB.wallet).toMatchObject({ id: 'wallet-b', balance: 90_000 });
    expect(summaryA.transactions[0]?.id).toBe('ledger-wallet-a');
    expect(summaryB.transactions[0]?.id).toBe('ledger-wallet-b');
    expect(tenantA.user.findUnique).toHaveBeenCalledTimes(1);
    expect(tenantB.user.findUnique).toHaveBeenCalledTimes(1);
  });
});
