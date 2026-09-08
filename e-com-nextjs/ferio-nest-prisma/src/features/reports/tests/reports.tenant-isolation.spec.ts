import type { AuditService } from '../../audit/services/audit.service';
import {
  getTenantContext,
  runWithTenantContext,
} from '../../../tenancy/context/tenant-context';
import { ReportsService } from '../services/reports.service';

const order = {
  id: 'same-order-id',
  reference: 'FER-SAME-ORDER',
  status: 'CONFIRMED',
  paymentStatus: 'UNPAID',
  fulfillmentStatus: 'READY_FOR_FULFILLMENT',
  returnStatus: 'NONE',
  refundStatus: 'NONE',
  paymentMethod: 'COD',
  currency: 'BDT',
  subtotal: 10000,
  total: 10000,
  discountTotal: 0,
  deliveryFee: 0,
  paymentCharge: 0,
  source: null,
  shipmentStatus: 'READY',
  confirmedAt: new Date('2026-09-01T08:00:00.000Z'),
  cancelledAt: null,
  createdAt: new Date('2026-09-01T07:00:00.000Z'),
  fulfillmentExceptions: [],
  refunds: [],
  rtoCases: [],
  codCollection: null,
  shipment: null,
  address: null,
  items: [],
} as const;

describe('ReportsService tenant isolation', () => {
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

  it('reads overview and export data only from the resolved tenant database', async () => {
    process.env.TENANCY_ENABLED = 'true';
    const tenantA = {
      order: { findMany: jest.fn().mockResolvedValue([order]) },
    };
    const tenantB = {
      order: {
        findMany: jest.fn().mockResolvedValue([{ ...order, total: 20000 }]),
      },
    };
    const tenantDb = {
      getOrLegacy: jest.fn(() =>
        getTenantContext().database.databaseName === 'tenant_a'
          ? tenantA
          : tenantB,
      ),
    };
    const audit = {
      record: jest.fn().mockResolvedValue({ id: 'audit-1' }),
    } as unknown as AuditService;
    const service = new ReportsService({} as never, audit, tenantDb as never);
    const query = { dateFrom: '2026-09-01', dateTo: '2026-09-02' };

    const overviewA = await runWithTenantContext(
      context('org-a', 'tenant_a'),
      () => service.overview(query),
    );
    const overviewB = await runWithTenantContext(
      context('org-b', 'tenant_b'),
      () => service.overview(query),
    );
    expect(overviewA.revenue.grossPlaced).toBe(10000);
    expect(overviewB.revenue.grossPlaced).toBe(20000);

    const exportA = await runWithTenantContext(
      context('org-a', 'tenant_a'),
      () => service.ordersExport(query, { userId: 'staff-a', role: 'staff' }),
    );
    const exportB = await runWithTenantContext(
      context('org-b', 'tenant_b'),
      () => service.ordersExport(query, { userId: 'staff-b', role: 'staff' }),
    );
    expect(exportA.rowCount).toBe(1);
    expect(exportB.rowCount).toBe(1);
    expect(tenantA.order.findMany).toHaveBeenCalledTimes(2);
    expect(tenantB.order.findMany).toHaveBeenCalledTimes(2);
  });
});
