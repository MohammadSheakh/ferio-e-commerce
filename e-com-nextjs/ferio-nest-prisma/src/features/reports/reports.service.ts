import {
  BadRequestException, Injectable,
  Optional,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PERMISSIONS, roleHasPermission, type UserPayload } from '@app/common';
import type { PrismaClient } from '@prisma/client';
import { PrismaService } from '@app/database';
import { TenantDbService } from '../../tenancy/tenant-db.service';
import { randomUUID } from 'node:crypto';
import { ReportQueryDto } from './dto/report-query.dto';
import { csvCell, maskExportName, reportPeriod, sumMoney } from './report.util';
import { maskCustomerPhone } from '../customers/customers.util';
import { AuditService } from '../audit/audit.service';

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

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  
    @Optional() private readonly tenantDb?: TenantDbService,) {}

  /**
   * MT-7/MT-8: tenant client inside resolved storefront/admin requests;
   * explicit legacy fallback otherwise. Never guesses.
   */
  private async db(): Promise<PrismaClient> {
    const tenant = await this.tenantDb?.tryGet();
    return tenant ?? (this.prisma as PrismaClient);
  }
  async overview(query: ReportQueryDto) {
    const db = await this.db();
    const period = reportPeriod(query);
    const source = query.source?.normalize('NFKC').trim();
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
      select: reportOrderSelect,
      orderBy: { createdAt: 'desc' },
    });
    return this.summarize(orders, period.dateFrom, period.dateTo, query);
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

  private summarize(
    orders: ReportOrder[],
    dateFrom: string,
    dateTo: string,
    query: ReportQueryDto,
  ) {
    const confirmed = orders.filter((order) => order.confirmedAt !== null);
    const shipped = orders.filter((order) =>
      Boolean(order.shipment?.pickedUpAt),
    );
    const delivered = orders.filter(
      (order) =>
        Boolean(order.shipment?.deliveredAt) ||
        order.status === 'DELIVERED' ||
        order.status === 'COMPLETED',
    );
    const cancelled = orders.filter(
      (order) => order.cancelledAt !== null || order.status === 'CANCELLED',
    );
    const returned = orders.filter(
      (order) => order.returnStatus === 'RECEIVED',
    );
    const returnCases = orders.filter((order) => order.returnStatus !== 'NONE');
    const rto = orders.filter(
      (order) =>
        ['RTO', 'RETURNED'].includes(order.shipment?.status ?? '') ||
        order.rtoCases.length > 0,
    );
    const rtoCost = sumMoney(
      orders.flatMap((order) =>
        order.rtoCases.map((rtoCase) => rtoCase.totalCost),
      ),
    );
    const knownCollected = orders.filter(
      (order) => order.paymentStatus === 'PAID',
    );
    const codExpectedAmount = sumMoney(
      orders.map((order) => order.codCollection?.expectedAmount ?? 0),
    );
    const codSettlementAmount = sumMoney(
      orders.map((order) => order.codCollection?.collectedAmount ?? 0),
    );
    const codCollectionVariance = sumMoney(
      orders.map((order) => order.codCollection?.collectionVariance ?? 0),
    );
    const refundAffected = orders.filter((order) =>
      ['PARTIAL', 'REFUNDED', 'FAILED'].includes(order.refundStatus),
    );
    const succeededRefundAmount = sumMoney(
      orders.flatMap((order) =>
        order.refunds
          .filter((refund) => refund.status === 'SUCCEEDED')
          .map((refund) => refund.amount),
      ),
    );
    const deliveredRefundAmount = sumMoney(
      delivered.flatMap((order) =>
        order.refunds
          .filter((refund) => refund.status === 'SUCCEEDED')
          .map((refund) => refund.amount),
      ),
    );
    const sourceCounts = this.countBy(
      orders,
      (order) => order.source || 'DIRECT',
    );
    const providerCounts = this.countBy(
      orders.filter((order) => order.shipment),
      (order) => order.shipment!.provider.code,
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
        placed: orders.length,
        confirmed: confirmed.length,
        shipped: shipped.length,
        delivered: delivered.length,
        cancelled: cancelled.length,
        returned: returned.length,
        returnCases: returnCases.length,
        rto: rto.length,
      },
      revenue: {
        currency: orders[0]?.currency ?? 'BDT',
        grossPlaced: sumMoney(orders.map((order) => order.total)),
        grossConfirmed: sumMoney(confirmed.map((order) => order.total)),
        grossDelivered: sumMoney(delivered.map((order) => order.total)),
        knownCollected: sumMoney(knownCollected.map((order) => order.total)),
        netOfRefund:
          sumMoney(delivered.map((order) => order.total)) -
          deliveredRefundAmount,
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
        paymentStatus: this.countBy(orders, (order) => order.paymentStatus),
        refundStatus: this.countBy(orders, (order) => order.refundStatus),
        refundAffectedOrders: refundAffected.length,
        refundAmount: succeededRefundAmount,
        rtoCost,
        codExpectedAmount,
        codSettlementAmount,
        codCollectionVariance,
        unresolvedCodCollections: orders.filter(
          (order) => order.codCollection?.status === 'EXPECTED',
        ).length,
        codCollectionVariances: orders.filter(
          (order) => order.codCollection?.status === 'VARIANCE',
        ).length,
        settlementModelAvailable: true,
      },
      operations: {
        pendingConfirmation: orders.filter(
          (order) => order.status === 'PENDING_CONFIRMATION',
        ).length,
        readyForFulfillment: orders.filter(
          (order) => order.fulfillmentStatus === 'READY_FOR_FULFILLMENT',
        ).length,
        openFulfillmentExceptions: sumMoney(
          orders.map((order) => order.fulfillmentExceptions.length),
        ),
        deliveryExceptions: orders.filter((order) =>
          ['DELIVERY_FAILED', 'FAILED', 'UNKNOWN'].includes(
            order.shipment?.status ?? '',
          ),
        ).length,
        rto: rto.length,
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
        sources: sourceCounts,
        providers: providerCounts,
      },
    };
  }

  private countBy<T>(rows: T[], key: (row: T) => string) {
    const counts = new Map<string, number>();
    for (const row of rows) {
      const value = key(row);
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    return [...counts]
      .map(([value, count]) => ({ value, count }))
      .sort(
        (left, right) =>
          right.count - left.count || left.value.localeCompare(right.value),
      );
  }
}
