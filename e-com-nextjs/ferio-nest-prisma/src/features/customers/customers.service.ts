import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@app/database';
import { CustomerQueryDto } from './customers.dto';
import {
  CustomerMetrics,
  customerRiskIndicators,
  maskCustomerEmail,
  maskCustomerPhone,
} from './customers.util';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: CustomerQueryDto) {
    const search = query.search?.normalize('NFKC').trim();
    const where: Prisma.CustomerWhereInput = {
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { phoneNormalized: { contains: search } },
              { phoneOriginal: { contains: search } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    // Filter by activity
    const now = new Date();
    if (query.filter === 'LAST_7_DAYS') {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      where.updatedAt = { gte: sevenDaysAgo };
    } else if (query.filter === 'LAST_30_DAYS') {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      where.updatedAt = { gte: thirtyDaysAgo };
    }

    // Filter by specific month (e.g. '2026-08')
    if (query.month) {
      const [yearStr, monthStr] = query.month.split('-');
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);
      if (!isNaN(year) && !isNaN(month)) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 1);
        where.updatedAt = { gte: startDate, lt: endDate };
      }
    }

    // Sorting
    let orderBy: Prisma.CustomerOrderByWithRelationInput = { updatedAt: 'desc' };
    if (query.sort === 'OLDEST_ONLINE') {
      orderBy = { updatedAt: 'asc' };
    } else if (query.sort === 'NAME_ASC') {
      orderBy = { name: 'asc' };
    }

    const [customers, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy,
        select: {
          id: true,
          name: true,
          phoneNormalized: true,
          email: true,
          createdAt: true,
          updatedAt: true,
          user: {
            select: {
              profileImageUrl: true,
              phoneNumber: true,
              updatedAt: true,
            },
          },
          orders: {
            take: 1,
            orderBy: { createdAt: 'desc' },
            select: { source: true, medium: true, campaign: true },
          },
        },
      }),
      this.prisma.customer.count({ where }),
    ]);

    const unlinkedEmails = customers
      .filter((c) => !c.user && c.email)
      .map((c) => c.email!.toLowerCase());

    const userByEmailMap = new Map<
      string,
      { profileImageUrl: string; phoneNumber?: string | null; updatedAt: Date }
    >();
    if (unlinkedEmails.length > 0) {
      const usersByEmail = await this.prisma.user.findMany({
        where: { email: { in: unlinkedEmails, mode: 'insensitive' }, isDeleted: false },
        select: { email: true, profileImageUrl: true, phoneNumber: true, updatedAt: true },
      });
      for (const u of usersByEmail) {
        if (u.email) {
          userByEmailMap.set(u.email.toLowerCase(), u);
        }
      }
    }

    const metrics = await this.metrics(customers.map((customer) => customer.id));
    const totalPages = Math.ceil(total / query.limit) || 1;
    const itemsList = customers.map((customer) => {
      const customerMetrics = metrics.get(customer.id)!;
      const matchedUser =
        customer.user ||
        (customer.email ? userByEmailMap.get(customer.email.toLowerCase()) : null);
      const effectivePhone = matchedUser?.phoneNumber || customer.phoneNormalized;
      return {
        id: customer.id,
        name: customer.name,
        phone: maskCustomerPhone(effectivePhone),
        email: maskCustomerEmail(customer.email),
        avatarUrl: matchedUser?.profileImageUrl || null,
        lastOnlineAt: matchedUser?.updatedAt?.toISOString() || customer.updatedAt?.toISOString(),
        createdAt: customer.createdAt,
        ...customerMetrics,
        latestAttribution: customer.orders[0] ?? null,
        riskIndicators: customerRiskIndicators(customerMetrics),
      };
    });

    return {
      items: itemsList,
      results: itemsList,
      data: itemsList,
      page: query.page,
      limit: query.limit,
      total,
      totalPages,
      pagination: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages,
        hasNextPage: query.page < totalPages,
        hasPrevPage: query.page > 1,
      },
    };
  }

  async detail(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            profileImageUrl: true,
            phoneNumber: true,
            updatedAt: true,
          },
        },
        addresses: { orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }] },
        orders: {
          take: 50,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            reference: true,
            status: true,
            paymentStatus: true,
            fulfillmentStatus: true,
            shipmentStatus: true,
            returnStatus: true,
            refundStatus: true,
            paymentMethod: true,
            total: true,
            source: true,
            medium: true,
            campaign: true,
            createdAt: true,
            address: { select: { district: true, area: true } },
            _count: { select: { items: true } },
          },
        },
        _count: { select: { orders: true, addresses: true } },
      },
    });
    if (!customer) throw new NotFoundException('Customer not found');
    const customerMetrics = (await this.metrics([id])).get(id)!;
    return {
      ...customer,
      phoneNormalized: customer.user?.phoneNumber || customer.phoneNormalized,
      phoneOriginal: customer.user?.phoneNumber || customer.phoneOriginal,
      metrics: customerMetrics,
      riskIndicators: customerRiskIndicators(customerMetrics),
      orderHistoryLimit: 50,
      orderHistoryTruncated: customer._count.orders > 50,
    };
  }

  private async metrics(customerIds: string[]) {
    const empty = new Map<string, CustomerMetrics>();
    for (const id of customerIds) empty.set(id, this.emptyMetrics());
    if (!customerIds.length) return empty;
    const [totals, delivered, cancelled, returned, rto] =
      await Promise.all([
        this.prisma.order.groupBy({
          by: ['customerId'],
          orderBy: { customerId: 'asc' },
          where: { customerId: { in: customerIds } },
          _count: { id: true },
        }),
        this.prisma.order.groupBy({
          by: ['customerId'],
          orderBy: { customerId: 'asc' },
          where: {
            customerId: { in: customerIds },
            status: { in: ['DELIVERED', 'COMPLETED'] },
          },
          _count: { id: true },
          _sum: { total: true },
          _max: { createdAt: true },
        }),
        this.prisma.order.groupBy({
          by: ['customerId'],
          orderBy: { customerId: 'asc' },
          where: { customerId: { in: customerIds }, status: 'CANCELLED' },
          _count: { id: true },
        }),
        this.prisma.order.groupBy({
          by: ['customerId'],
          orderBy: { customerId: 'asc' },
          where: {
            customerId: { in: customerIds },
            returnStatus: { not: 'NONE' },
          },
          _count: { id: true },
        }),
        this.prisma.order.groupBy({
          by: ['customerId'],
          orderBy: { customerId: 'asc' },
          where: { customerId: { in: customerIds }, shipmentStatus: 'RTO' },
          _count: { id: true },
        }),
      ]);
    for (const row of totals) empty.get(row.customerId)!.totalOrderCount = row._count.id;
    for (const row of delivered) {
      const result = empty.get(row.customerId)!;
      result.deliveredOrderCount = row._count.id;
      result.deliveredSpend = row._sum.total ?? 0;
      result.lastPurchaseAt = row._max.createdAt ?? null;
    }
    for (const row of cancelled) empty.get(row.customerId)!.cancelledOrderCount = row._count.id;
    for (const row of returned) empty.get(row.customerId)!.returnedOrderCount = row._count.id;
    for (const row of rto) empty.get(row.customerId)!.rtoOrderCount = row._count.id;
    return empty;
  }

  private emptyMetrics(): CustomerMetrics {
    return {
      totalOrderCount: 0,
      deliveredOrderCount: 0,
      cancelledOrderCount: 0,
      returnedOrderCount: 0,
      rtoOrderCount: 0,
      deliveredSpend: 0,
      lastPurchaseAt: null,
    };
  }
}
