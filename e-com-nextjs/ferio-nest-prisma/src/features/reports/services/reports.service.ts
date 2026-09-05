import { BadRequestException, Injectable, Optional } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PERMISSIONS, roleHasPermission, type UserPayload } from '@app/common';
import type { PrismaClient } from '@prisma/client';
import { PrismaService } from '@app/database';
import { TenantDbService } from '../../../tenancy/tenant-db.service';
import { randomUUID } from 'node:crypto';
import { ReportQueryDto } from '../dto/report-query.dto';
import { csvCell, maskExportName, reportPeriod } from '../utils/report.util';
import { maskCustomerPhone } from '../../customers/utils/customers.util';
import { AuditService } from '../../audit/services/audit.service';

const reportOrderSelect = {
  id: true,
  status: true,
  paymentStatus: true,
  fulfillmentStatus: true,
  returnStatus: true,
  refundStatus: true,
  paymentMethod: true,
  currency: true,
  total: true,
  discountTotal: true,
  deliveryFee: true,
  paymentCharge: true,
  source: true,
  confirmedAt: true,
  cancelledAt: true,
  createdAt: true,
  fulfillmentExceptions: {
    where: { status: 'OPEN' as const },
    select: { id: true },
  },
  refunds: {
    select: { amount: true, status: true },
  },
  rtoCases: {
    select: { totalCost: true },
  },
  codCollection: {
    select: {
      status: true,
      expectedAmount: true,
      collectedAmount: true,
      collectionVariance: true,
    },
  },
  shipment: {
    select: {
      status: true,
      pickedUpAt: true,
      deliveredAt: true,
      returnedAt: true,
      shippingCharge: true,
      provider: { select: { code: true, name: true } },
    },
  },
} satisfies Prisma.OrderSelect;

type ReportOrder = Prisma.OrderGetPayload<{ select: typeof reportOrderSelect }>;

const REPORT_CHUNK_SIZE = 5_000;

export type ReportAccumulator = ReturnType<typeof createReportAccumulator>;
type ReportOrderAcc = {
  currency?: string;
  placed: number;
  confirmed: number;
  shipped: number;
  delivered: number;
  cancelled: number;
  returned: number;
  returnCases: number;
  rto: number;
  rtoCost: number;
  grossPlaced: number;
  grossConfirmed: number;
  grossDelivered: number;
  knownCollected: number;
  codExpectedAmount: number;
  codSettlementAmount: number;
  codCollectionVariance: number;
  refundAffectedOrders: number;
  succeededRefundAmount: number;
  deliveredRefundAmount: number;
  pendingConfirmation: number;
  readyForFulfillment: number;
  openFulfillmentExceptions: number;
  deliveryExceptions: number;
  unresolvedCodCollections: number;
  codCollectionVariances: number;
  paymentStatusCounts: Map<string, number>;
  refundStatusCounts: Map<string, number>;
  sourceCounts: Map<string, number>;
  providerCounts: Map<string, number>;
};

function bump(counts: Map<string, number>, key: string): void {
  counts.set(key, (counts.get(key) ?? 0) + 1);
}

function addMoney(current: number, amount: number): number {
  const total = current + amount;
  if (!Number.isSafeInteger(total)) {
    throw new Error('REPORT_MONEY_TOTAL_OUT_OF_RANGE');
  }
  return total;
}

/**
 * §16.3 bounded aggregation: per-order fold replacing whole-period
 * findMany+JS-reduce. Field-by-field port of the previous summarize() so
 * report output is unchanged; only residency differs.
 */
function createReportAccumulator(): ReportOrderAcc & {
  add(order: ReportOrder): void;
} {
  const acc: ReportOrderAcc = {
    currency: undefined,
    placed: 0,
    confirmed: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
    returned: 0,
    returnCases: 0,
    rto: 0,
    rtoCost: 0,
    grossPlaced: 0,
    grossConfirmed: 0,
    grossDelivered: 0,
    knownCollected: 0,
    codExpectedAmount: 0,
    codSettlementAmount: 0,
    codCollectionVariance: 0,
    refundAffectedOrders: 0,
    succeededRefundAmount: 0,
    deliveredRefundAmount: 0,
    pendingConfirmation: 0,
    readyForFulfillment: 0,
    openFulfillmentExceptions: 0,
    deliveryExceptions: 0,
    unresolvedCodCollections: 0,
    codCollectionVariances: 0,
    paymentStatusCounts: new Map(),
    refundStatusCounts: new Map(),
    sourceCounts: new Map(),
    providerCounts: new Map(),
  };
  const isConfirmed = (o: ReportOrder) => o.confirmedAt !== null;
  const isShipped = (o: ReportOrder) => Boolean(o.shipment?.pickedUpAt);
  const isDelivered = (o: ReportOrder) =>
    Boolean(o.shipment?.deliveredAt) ||
    o.status === 'DELIVERED' ||
    o.status === 'COMPLETED';

  return {
    ...acc,
    add(this: ReportOrderAcc, order: ReportOrder): void {
      if (!this.currency) this.currency = order.currency;
      this.placed += 1;
      if (isConfirmed(order)) {
        this.confirmed += 1;
        this.grossConfirmed = addMoney(this.grossConfirmed, order.total);
      }
      if (isShipped(order)) this.shipped += 1;
      const delivered = isDelivered(order);
      if (delivered) {
        this.delivered += 1;
        this.grossDelivered = addMoney(this.grossDelivered, order.total);
      }
      if (order.cancelledAt !== null || order.status === 'CANCELLED') {
        this.cancelled += 1;
      }
      if (order.returnStatus === 'RECEIVED') this.returned += 1;
      if (order.returnStatus !== 'NONE') this.returnCases += 1;

      const orderIsRto =
        ['RTO', 'RETURNED'].includes(order.shipment?.status ?? '') ||
        order.rtoCases.length > 0;
      if (orderIsRto) this.rto += 1;
      for (const rtoCase of order.rtoCases) {
        this.rtoCost = addMoney(this.rtoCost, rtoCase.totalCost);
      }

      this.grossPlaced = addMoney(this.grossPlaced, order.total);
      if (order.paymentStatus === 'PAID') {
        this.knownCollected = addMoney(this.knownCollected, order.total);
      }

      if (order.codCollection) {
        this.codExpectedAmount = addMoney(
          this.codExpectedAmount,
          order.codCollection.expectedAmount ?? 0,
        );
        this.codSettlementAmount = addMoney(
          this.codSettlementAmount,
          order.codCollection.collectedAmount ?? 0,
        );
        this.codCollectionVariance = addMoney(
          this.codCollectionVariance,
          order.codCollection.collectionVariance ?? 0,
        );
      }
      if (order.codCollection?.status === 'EXPECTED') {
        this.unresolvedCodCollections += 1;
      }
      if (order.codCollection?.status === 'VARIANCE') {
        this.codCollectionVariances += 1;
      }

      if (['PARTIAL', 'REFUNDED', 'FAILED'].includes(order.refundStatus)) {
        this.refundAffectedOrders += 1;
      }
      for (const refund of order.refunds) {
        if (refund.status === 'SUCCEEDED') {
          this.succeededRefundAmount = addMoney(
            this.succeededRefundAmount,
            refund.amount,
          );
          if (delivered) {
            this.deliveredRefundAmount = addMoney(
              this.deliveredRefundAmount,
              refund.amount,
            );
          }
        }
      }

      if (order.status === 'PENDING_CONFIRMATION') {
        this.pendingConfirmation += 1;
      }
      if (order.fulfillmentStatus === 'READY_FOR_FULFILLMENT') {
        this.readyForFulfillment += 1;
      }
      this.openFulfillmentExceptions += order.fulfillmentExceptions.length;
      if (
        ['DELIVERY_FAILED', 'FAILED', 'UNKNOWN'].includes(
          order.shipment?.status ?? '',
        )
      ) {
        this.deliveryExceptions += 1;
      }

      bump(this.paymentStatusCounts, order.paymentStatus);
      bump(this.refundStatusCounts, order.refundStatus);
      bump(this.sourceCounts, order.source || 'DIRECT');
      if (order.shipment) {
        bump(this.providerCounts, order.shipment.provider.code);
      }
    },
  };
}

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,

    @Optional() private readonly tenantDb?: TenantDbService,
  ) {}

  /**
   * MT-7/MT-8: tenant client inside resolved storefront/admin requests;
   * explicit legacy fallback otherwise. Never guesses.
   */
  private async db(): Promise<PrismaClient> {
    return this.tenantDb ? this.tenantDb.getOrLegacy(this.prisma) : this.prisma;
  }
  async overview(query: ReportQueryDto) {
    const db = await this.db();
    const period = reportPeriod(query);
    const source = query.source?.normalize('NFKC').trim();
    const baseWhere: Prisma.OrderWhereInput = {
      createdAt: { gte: period.from, lte: period.to },
      source:
        source === 'DIRECT'
          ? null
          : source
            ? { equals: source, mode: 'insensitive' }
            : undefined,
      shipment: query.provider
        ? { provider: { code: query.provider } }
        : undefined,
    };

    // §16.3 bounded aggregation: the overview folds orders in keyset-
    // paginated chunks so a merchant's whole history can never be resident
    // in memory. Output is identical to folding one giant array.
    const acc = createReportAccumulator();
    let last: { createdAt: Date; id: string } | undefined;
    for (;;) {
      const pageWhere = last
        ? {
            AND: [
              baseWhere,
              {
                OR: [
                  { createdAt: { lt: last.createdAt } },
                  {
                    AND: [
                      { createdAt: { equals: last.createdAt } },
                      { id: { lt: last.id } },
                    ],
                  },
                ],
              },
            ],
          }
        : baseWhere;
      const batch = await db.order.findMany({
        where: pageWhere,
        select: reportOrderSelect,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: REPORT_CHUNK_SIZE,
      });
      if (batch.length === 0) break;
      for (const order of batch) acc.add(order);
      if (batch.length < REPORT_CHUNK_SIZE) break;
      const tail = batch[batch.length - 1];
      last = { createdAt: tail.createdAt, id: tail.id };
    }
    return this.finalizeSummary(acc, period.dateFrom, period.dateTo, query);
  }

  async ordersExport(query: ReportQueryDto, actor: UserPayload) {
    const db = await this.db();
    const period = reportPeriod(query);
    const source = query.source?.normalize('NFKC').trim();
    const canViewCustomerDetails = roleHasPermission(
      actor.role,
      PERMISSIONS.CUSTOMERS_READ,
      actor.permissions ?? [],
    );
    const orders = await db.order.findMany({
      where: {
        createdAt: { gte: period.from, lte: period.to },
        source:
          source === 'DIRECT'
            ? null
            : source
              ? { equals: source, mode: 'insensitive' }
              : undefined,
        shipment: query.provider
          ? { provider: { code: query.provider } }
          : undefined,
      },
      take: 5_001,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: {
        reference: true,
        createdAt: true,
        status: true,
        paymentStatus: true,
        fulfillmentStatus: true,
        shipmentStatus: true,
        returnStatus: true,
        refundStatus: true,
        paymentMethod: true,
        currency: true,
        subtotal: true,
        discountTotal: true,
        deliveryFee: true,
        paymentCharge: true,
        total: true,
        source: true,
        address: {
          select: {
            recipientName: true,
            phoneNormalized: true,
            district: true,
            area: true,
          },
        },
        items: {
          orderBy: { createdAt: 'asc' },
          select: {
            productName: true,
            variantName: true,
            sku: true,
            quantity: true,
          },
        },
        shipment: {
          select: { provider: { select: { code: true } } },
        },
      },
    });
    if (orders.length > 5_000) {
      throw new BadRequestException(
        'Export exceeds 5,000 rows; narrow the date or report filters.',
      );
    }

    const headers = [
      'order_reference',
      'created_at_utc',
      'order_status',
      'payment_status',
      'fulfillment_status',
      'shipment_status',
      'return_status',
      'refund_status',
      'payment_method',
      'currency',
      'subtotal_minor',
      'discount_minor',
      'delivery_fee_minor',
      'payment_charge_minor',
      'total_minor',
      'source',
      'courier',
      'recipient_name',
      'phone',
      'district',
      'area',
      'item_count',
      'item_summary',
    ];
    const rows = orders.map((order) => {
      const itemCount = order.items.reduce(
        (total, item) => total + item.quantity,
        0,
      );
      const itemSummary = order.items
        .map(
          (item) =>
            `${item.productName} / ${item.variantName} / ${item.sku} x${item.quantity}`,
        )
        .join(' | ');
      return [
        order.reference,
        order.createdAt.toISOString(),
        order.status,
        order.paymentStatus,
        order.fulfillmentStatus,
        order.shipmentStatus,
        order.returnStatus,
        order.refundStatus,
        order.paymentMethod,
        order.currency,
        order.subtotal,
        order.discountTotal,
        order.deliveryFee,
        order.paymentCharge,
        order.total,
        order.source ?? 'DIRECT',
        order.shipment?.provider.code ?? '',
        canViewCustomerDetails
          ? (order.address?.recipientName ?? '')
          : maskExportName(order.address?.recipientName ?? ''),
        canViewCustomerDetails
          ? (order.address?.phoneNormalized ?? '')
          : maskCustomerPhone(order.address?.phoneNormalized ?? ''),
        order.address?.district ?? '',
        canViewCustomerDetails ? (order.address?.area ?? '') : '[masked]',
        itemCount,
        itemSummary,
      ]
        .map(csvCell)
        .join(',');
    });
    const exportId = randomUUID();
    await this.audit.record({
      action: 'REPORT_ORDERS_EXPORTED',
      entityType: 'ReportExport',
      entityId: exportId,
      actor,
      metadata: {
        report: 'orders',
        rowCount: orders.length,
        customerFields: canViewCustomerDetails ? 'permitted' : 'masked',
        dateFrom: period.dateFrom,
        dateTo: period.dateTo,
        source: query.source ?? null,
        provider: query.provider ?? null,
      },
    });
    return {
      exportId,
      fileName: `ferio-orders-${period.dateFrom}-to-${period.dateTo}.csv`,
      contentType: 'text/csv;charset=utf-8',
      content: `\uFEFF${headers.map(csvCell).join(',')}\r\n${rows.join('\r\n')}`,
      rowCount: orders.length,
      customerFields: canViewCustomerDetails ? 'permitted' : 'masked',
    };
  }

  private finalizeSummary(
    acc: ReportAccumulator,
    dateFrom: string,
    dateTo: string,
    query: ReportQueryDto,
  ) {
    const sorted = (
      counts: Map<string, number>,
    ): Array<{ value: string; count: number }> =>
      [...counts]
        .map(([value, count]) => ({ value, count }))
        .sort(
          (left, right) =>
            right.count - left.count || left.value.localeCompare(right.value),
        );

    return {
      basis: {
        dateFrom,
        dateTo,
        timezone: 'UTC',
        dateField: 'Order.createdAt',
        description:
          'Cohort of orders created during the selected UTC dates; later outcomes are attributed back to that cohort.',
        filters: {
          source: query.source ?? null,
          provider: query.provider ?? null,
        },
      },
      outcomes: {
        placed: acc.placed,
        confirmed: acc.confirmed,
        shipped: acc.shipped,
        delivered: acc.delivered,
        cancelled: acc.cancelled,
        returned: acc.returned,
        returnCases: acc.returnCases,
        rto: acc.rto,
      },
      revenue: {
        currency: acc.currency ?? 'BDT',
        grossPlaced: acc.grossPlaced,
        grossConfirmed: acc.grossConfirmed,
        grossDelivered: acc.grossDelivered,
        knownCollected: acc.knownCollected,
        netOfRefund: acc.grossDelivered - acc.deliveredRefundAmount,
        definitions: {
          grossPlaced: 'Order total for every order in the cohort.',
          grossConfirmed:
            'Order total for cohort orders with a recorded confirmation timestamp.',
          grossDelivered:
            'Order total for cohort orders with a delivered order or shipment outcome.',
          knownCollected:
            'Order total only where the internal order payment status is PAID.',
          netOfRefund:
            'Gross delivered less succeeded refund ledger amounts for delivered cohort orders.',
        },
      },
      finance: {
        paymentStatus: sorted(acc.paymentStatusCounts),
        refundStatus: sorted(acc.refundStatusCounts),
        refundAffectedOrders: acc.refundAffectedOrders,
        refundAmount: acc.succeededRefundAmount,
        rtoCost: acc.rtoCost,
        codExpectedAmount: acc.codExpectedAmount,
        codSettlementAmount: acc.codSettlementAmount,
        codCollectionVariance: acc.codCollectionVariance,
        unresolvedCodCollections: acc.unresolvedCodCollections,
        codCollectionVariances: acc.codCollectionVariances,
        settlementModelAvailable: true,
      },
      operations: {
        pendingConfirmation: acc.pendingConfirmation,
        readyForFulfillment: acc.readyForFulfillment,
        openFulfillmentExceptions: acc.openFulfillmentExceptions,
        deliveryExceptions: acc.deliveryExceptions,
        rto: acc.rto,
      },
      contribution: {
        status: 'INCOMPLETE' as const,
        value: null,
        label: 'Contribution unavailable',
        missingInputs: [
          'approved product cost source',
          'acquisition cost allocation',
          'packaging cost',
          'courier subsidy allocation',
          'approved return and RTO cost allocation policy',
          'messaging cost allocation',
        ],
      },
      dimensions: {
        sources: sorted(acc.sourceCounts),
        providers: sorted(acc.providerCounts),
      },
    };
  }
}
