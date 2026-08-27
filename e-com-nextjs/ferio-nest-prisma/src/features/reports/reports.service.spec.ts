import type { PrismaService } from '@app/database';
import type { AuditService } from '../audit/audit.service';
import { ReportsService } from './reports.service';

const baseOrder = {
  id: 'order-1',
  status: 'CONFIRMED',
  paymentStatus: 'UNPAID',
  fulfillmentStatus: 'READY_FOR_FULFILLMENT',
  returnStatus: 'NONE',
  refundStatus: 'NONE',
  paymentMethod: 'COD',
  currency: 'BDT',
  total: 10000,
  discountTotal: 0,
  deliveryFee: 1000,
  paymentCharge: 0,
  source: null,
  confirmedAt: new Date('2026-08-02T08:00:00.000Z'),
  cancelledAt: null,
  createdAt: new Date('2026-08-02T07:00:00.000Z'),
  fulfillmentExceptions: [],
  refunds: [],
  rtoCases: [],
  codCollection: null,
  shipment: null,
} as const;

describe('ReportsService', () => {
  const prisma = { order: { findMany: jest.fn() } };
  const audit = { record: jest.fn().mockResolvedValue({ id: 'audit-1' }) };
  const service = new ReportsService(
    prisma as unknown as PrismaService,
    audit as unknown as AuditService,
  );

  beforeEach(() => jest.clearAllMocks());

  it('separates known outcome and revenue bases', async () => {
    prisma.order.findMany.mockResolvedValue([
      baseOrder,
      {
        ...baseOrder,
        id: 'order-2',
        status: 'DELIVERED',
        paymentStatus: 'PAID',
        fulfillmentStatus: 'FULFILLED',
        total: 15000,
        source: 'facebook',
        shipment: {
          status: 'DELIVERED',
          pickedUpAt: new Date('2026-08-03T08:00:00.000Z'),
          deliveredAt: new Date('2026-08-04T08:00:00.000Z'),
          returnedAt: null,
          shippingCharge: 900,
          provider: { code: 'PATHAO', name: 'Pathao' },
        },
        refunds: [{ amount: 2500, status: 'SUCCEEDED' }],
        codCollection: {
          status: 'SETTLED',
          expectedAmount: 15000,
          collectedAmount: 15000,
          collectionVariance: 0,
        },
      },
      {
        ...baseOrder,
        id: 'order-3',
        status: 'CANCELLED',
        confirmedAt: null,
        cancelledAt: new Date('2026-08-03T09:00:00.000Z'),
        total: 5000,
        rtoCases: [{ totalCost: 3500 }],
      },
    ]);

    const report = await service.overview({
      dateFrom: '2026-08-01',
      dateTo: '2026-08-11',
    });

    expect(report.outcomes).toEqual(
      expect.objectContaining({
        placed: 3,
        confirmed: 2,
        shipped: 1,
        delivered: 1,
        cancelled: 1,
        rto: 1,
      }),
    );
    expect(report.revenue).toEqual(
      expect.objectContaining({
        grossPlaced: 30000,
        grossConfirmed: 25000,
        grossDelivered: 15000,
        knownCollected: 15000,
        netOfRefund: 12500,
      }),
    );
    expect(report.finance.refundAmount).toBe(2500);
    expect(report.finance.rtoCost).toBe(3500);
    expect(report.finance.codExpectedAmount).toBe(15000);
    expect(report.finance.codSettlementAmount).toBe(15000);
    expect(report.contribution).toEqual(
      expect.objectContaining({ status: 'INCOMPLETE', value: null }),
    );
  });

  it('does not classify an order without a shipment as shipped', async () => {
    prisma.order.findMany.mockResolvedValue([baseOrder]);
    const report = await service.overview({
      dateFrom: '2026-08-01',
      dateTo: '2026-08-11',
    });
    expect(report.outcomes.shipped).toBe(0);
  });

  it('accumulates totals across keyset pages without retaining total arrays', async () => {
    prisma.order.findMany
      .mockResolvedValueOnce(
        Array.from({ length: 5_000 }, (_, index) => ({
          ...baseOrder,
          id: `order-${index}`,
          total: 100,
        })),
      )
      .mockResolvedValueOnce([
        { ...baseOrder, id: 'order-tail', total: 250 },
      ]);

    const report = await service.overview({
      dateFrom: '2026-08-01',
      dateTo: '2026-08-11',
    });

    expect(report.outcomes.placed).toBe(5_001);
    expect(report.revenue.grossPlaced).toBe(500_250);
    expect(prisma.order.findMany).toHaveBeenCalledTimes(2);
  });

  it('masks customer fields when a report reader lacks customer permission', async () => {
    prisma.order.findMany.mockResolvedValue([
      {
        reference: 'FER-1001',
        createdAt: new Date('2026-08-02T07:00:00.000Z'),
        status: 'CONFIRMED',
        paymentStatus: 'UNPAID',
        fulfillmentStatus: 'READY_FOR_FULFILLMENT',
        shipmentStatus: 'READY',
        returnStatus: 'NONE',
        refundStatus: 'NONE',
        paymentMethod: 'COD',
        currency: 'BDT',
        subtotal: 9000,
        discountTotal: 0,
        deliveryFee: 1000,
        paymentCharge: 0,
        total: 10000,
        source: null,
        address: {
          recipientName: 'Rahim Uddin',
          phoneNormalized: '+8801700123456',
          district: 'Dhaka',
          area: 'Rampura',
        },
        items: [
          {
            productName: '=Road Bike',
            variantName: 'Black',
            sku: 'BIKE-1',
            quantity: 1,
          },
        ],
        shipment: null,
      },
    ]);

    const result = await service.ordersExport(
      { dateFrom: '2026-08-01', dateTo: '2026-08-11' },
      {
        userId: 'staff-1',
        email: 'ops@example.com',
        role: 'staff',
        permissions: ['reports.read'],
      },
    );

    expect(result.customerFields).toBe('masked');
    expect(result.content).toContain('"R***"');
    expect(result.content).toContain('"\'+88017****3456"');
    expect(result.content).toContain('"[masked]"');
    expect(result.content).toContain("'=Road Bike");
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'REPORT_ORDERS_EXPORTED',
        metadata: expect.objectContaining({ customerFields: 'masked' }),
      }),
    );
  });

  it('reveals bounded customer fields with customer permission', async () => {
    prisma.order.findMany.mockResolvedValue([
      {
        reference: 'FER-1002',
        createdAt: new Date('2026-08-03T07:00:00.000Z'),
        status: 'DELIVERED',
        paymentStatus: 'PAID',
        fulfillmentStatus: 'FULFILLED',
        shipmentStatus: 'DELIVERED',
        returnStatus: 'NONE',
        refundStatus: 'NONE',
        paymentMethod: 'COD',
        currency: 'BDT',
        subtotal: 10000,
        discountTotal: 0,
        deliveryFee: 0,
        paymentCharge: 0,
        total: 10000,
        source: 'facebook',
        address: {
          recipientName: 'Rahim Uddin',
          phoneNormalized: '+8801700123456',
          district: 'Dhaka',
          area: 'Rampura',
        },
        items: [],
        shipment: { provider: { code: 'PATHAO' } },
      },
    ]);

    const result = await service.ordersExport(
      { dateFrom: '2026-08-01', dateTo: '2026-08-11' },
      {
        userId: 'staff-2',
        email: 'lead@example.com',
        role: 'staff',
        permissions: ['reports.read', 'customers.read'],
      },
    );

    expect(result.customerFields).toBe('permitted');
    expect(result.content).toContain('"Rahim Uddin"');
    expect(result.content).toContain('"\'+8801700123456"');
    expect(result.content).toContain('"Rampura"');
  });
});
