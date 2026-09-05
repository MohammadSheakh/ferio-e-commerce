import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { randomBytes, timingSafeEqual } from 'crypto';
import type { PrismaClient } from '@prisma/client';import { Prisma } from '@prisma/client';
import { PrismaService } from '@app/database';
import { TenantDbService } from '../../tenancy/tenant-db.service';import type { UserPayload } from '@app/common';
import { normalizeBangladeshPhone } from '../checkout/utils/checkout.util';
import {
  CreateWarrantyClaimDto,
  UpdateWarrantyClaimDto,
  VerifyWarrantyOrderDto,
  WarrantyClaimQueryDto,
} from './warranty.dto';
import { canTransitionWarranty } from './utils/warranty.util';

const adminClaimInclude = {
  submittedBy: { select: { name: true, email: true } },
  orderItem: {
    include: {
      order: {
        select: {
          customer: { select: { name: true, phoneNormalized: true } },
        },
      },
    },
  },
  evidence: true,
  history: { orderBy: { createdAt: 'asc' as const } },
} satisfies Prisma.WarrantyClaimInclude;

@Injectable()
export class WarrantyService {
  constructor(
    private prisma: PrismaService,
    @Optional() private readonly tenantDb?: TenantDbService,
  ) {}

  /**
   * MT-7: tenant client inside resolved contexts; explicit legacy fallback.
   */
  private async db(): Promise<PrismaClient> {
    return this.tenantDb
      ? this.tenantDb.getOrLegacy(this.prisma)
      : this.prisma;
  }  private async verifiedOrder(dto: VerifyWarrantyOrderDto) {
    const db = await this.db();
    const reference = dto.reference.trim().toUpperCase();
    const phone = normalizeBangladeshPhone(dto.phone);
    const order = await db.order.findUnique({
      where: { reference },
      include: { address: true, items: true },
    });
    const expected = order?.address?.phoneNormalized;
    const valid =
      expected &&
      expected.length === phone.length &&
      timingSafeEqual(Buffer.from(expected), Buffer.from(phone));
    if (!order || !valid)
      throw new NotFoundException('Delivered order could not be verified');
    if (!['DELIVERED', 'COMPLETED'].includes(order.status))
      throw new ConflictException('Warranty claims require a delivered order');
    return order;
  }
  async eligible(dto: VerifyWarrantyOrderDto) {
    const order = await this.verifiedOrder(dto);
    return {
      reference: order.reference,
      items: order.items.map((i) => ({
        id: i.id,
        productName: i.productName,
        variantName: i.variantName,
        sku: i.sku,
        imageUrl: i.imageUrl,
        quantity: i.quantity,
      })),
    };
  }
  async create(dto: CreateWarrantyClaimDto, user: UserPayload) {
    const db = await this.db();
    const order = await this.verifiedOrder(dto);
    const item = order.items.find((i) => i.id === dto.orderItemId);
    if (!item) throw new NotFoundException('Order item not found');
    const duplicate = await db.warrantyClaim.count({
      where: {
        orderItemId: item.id,
        status: { notIn: ['RESOLVED', 'REJECTED'] },
      },
    });
    if (duplicate)
      throw new ConflictException(
        'An active warranty claim already exists for this item',
      );
    return db.warrantyClaim.create({
      data: {
        reference: `WAR-${randomBytes(4).toString('hex').toUpperCase()}`,
        issueDescription: dto.issueDescription.trim(),
        submittedById: user.userId,
        orderItemId: item.id,
        orderReferenceSnapshot: order.reference,
        productNameSnapshot: item.productName,
        variantNameSnapshot: item.variantName,
        skuSnapshot: item.sku,
        evidence: { create: dto.evidence },
        history: {
          create: {
            newStatus: 'SUBMITTED',
            source: 'CUSTOMER',
            actorId: user.userId,
            note: 'Warranty claim submitted',
          },
        },
      },
      include: { evidence: true, history: true },
    });
  }
  async mine(user: UserPayload) {
    const db = await this.db();
    return db.warrantyClaim.findMany({
      where: { submittedById: user.userId },
      include: { evidence: true, history: { orderBy: { createdAt: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
  }
  async all(query: WarrantyClaimQueryDto) {
    const db = await this.db();
    const search = query.search?.normalize('NFKC').trim();
    const where: Prisma.WarrantyClaimWhereInput = {
      status: query.status,
      ...(search
        ? {
            OR: [
              { reference: { contains: search, mode: 'insensitive' } },
              {
                orderReferenceSnapshot: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                productNameSnapshot: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                variantNameSnapshot: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              { skuSnapshot: { contains: search, mode: 'insensitive' } },
              {
                submittedBy: {
                  is: {
                    OR: [
                      { name: { contains: search, mode: 'insensitive' } },
                      { email: { contains: search, mode: 'insensitive' } },
                    ],
                  },
                },
              },
              {
                orderItem: {
                  is: {
                    order: {
                      is: {
                        customer: {
                          is: {
                            OR: [
                              {
                                name: {
                                  contains: search,
                                  mode: 'insensitive',
                                },
                              },
                              {
                                phoneNormalized: {
                                  contains: search,
                                  mode: 'insensitive',
                                },
                              },
                            ],
                          },
                        },
                      },
                    },
                  },
                },
              },
            ],
          }
        : {}),
    };
    const [items, total] = await db.$transaction([
      db.warrantyClaim.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: adminClaimInclude,
        orderBy: { createdAt: 'desc' },
      }),
      db.warrantyClaim.count({ where }),
    ]);
    return {
      items,
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    };
  }
  async update(id: string, dto: UpdateWarrantyClaimDto, actor: UserPayload) {
    const db = await this.db();
    const claim = await db.warrantyClaim.findUnique({ where: { id } });
    if (!claim) throw new NotFoundException('Warranty claim not found');
    if (!canTransitionWarranty(claim.status, dto.status))
      throw new ConflictException(
        `Cannot move warranty claim from ${claim.status} to ${dto.status}`,
      );
    if (dto.status === 'REJECTED' && !dto.rejectionReason?.trim())
      throw new BadRequestException('Rejection reason is required');
    const now = new Date();
    return db.$transaction(async (tx) => {
      await tx.warrantyClaim.update({
        where: { id },
        data: {
          status: dto.status,
          adminNote: dto.note?.trim(),
          rejectionReason:
            dto.status === 'REJECTED' ? dto.rejectionReason?.trim() : undefined,
          handledById: actor.userId,
          resolvedAt: dto.status === 'RESOLVED' ? now : undefined,
          rejectedAt: dto.status === 'REJECTED' ? now : undefined,
        },
      });
      await tx.warrantyClaimHistory.create({
        data: {
          claimId: id,
          oldStatus: claim.status,
          newStatus: dto.status,
          source: 'ADMIN',
          actorId: actor.userId,
          note:
            dto.status === 'REJECTED'
              ? dto.rejectionReason?.trim()
              : dto.note?.trim(),
        },
      });
      return tx.warrantyClaim.findUnique({
        where: { id },
        include: { evidence: true, history: true },
      });
    });
  }
}
