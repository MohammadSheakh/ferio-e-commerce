import type { PrismaClient } from '@prisma/client';
import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { PrismaService } from '@app/database';
import { TenantDbService } from '../../tenancy/tenant-db.service';
import { CreateProductRequestDto, QueryProductRequestDto, UpdateProductRequestStatusDto } from './dto/product-request.dto';

@Injectable()
export class ProductRequestService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly tenantDb?: TenantDbService,
  ) {}

  /**
   * MT-7: tenant client inside resolved contexts; explicit legacy
   * fallback outside resolved requests. Never guesses.
   */
  private async db(): Promise<PrismaClient> {
    const tenant = await this.tenantDb?.tryGet();
    return tenant ?? (this.prisma as PrismaClient);
  }

  async createRequest(dto: CreateProductRequestDto, userId?: string) {
    const db = await this.db();
    let finalPhone = dto.phone?.trim() || null;
    let finalName = dto.name?.trim() || null;

    if (userId) {
      const u = await db.user.findUnique({
        where: { id: userId },
        select: { name: true, phoneNumber: true },
      });
      if (u) {
        if (!finalPhone && u.phoneNumber) finalPhone = u.phoneNumber;
        if (!finalName && u.name) finalName = u.name;
      }
    }

    return db.productRequest.create({
      data: {
        productName: dto.productName.trim(),
        name: finalName,
        phone: finalPhone,
        userId: userId || null,
        status: 'PENDING',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phoneNumber: true,
            profileImageUrl: true,
          },
        },
      },
    });
  }

  async getAllRequests(query: QueryProductRequestDto) {
    const db = await this.db();
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Number(query.limit) || 20);
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.search?.trim()) {
      const q = query.search.trim();
      where.OR = [
        { productName: { contains: q, mode: 'insensitive' } },
        { name: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
        { user: { name: { contains: q, mode: 'insensitive' } } },
        { user: { email: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [results, total] = await Promise.all([
      db.productRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phoneNumber: true,
              profileImageUrl: true,
            },
          },
        },
      }),
      db.productRequest.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;
    return {
      items: results,
      results,
      data: results,
      page,
      limit,
      total,
      totalPages,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  async updateStatus(id: string, dto: UpdateProductRequestStatusDto) {
    const db = await this.db();
    const existing = await db.productRequest.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Product request not found.');
    }

    return db.productRequest.update({
      where: { id },
      data: {
        status: dto.status ? (dto.status as any) : existing.status,
        notes: dto.notes !== undefined ? dto.notes : existing.notes,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phoneNumber: true,
            profileImageUrl: true,
          },
        },
      },
    });
  }

  async deleteRequest(id: string) {
    const db = await this.db();
    const existing = await db.productRequest.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Product request not found.');
    }

    return db.productRequest.delete({ where: { id } });
  }
}
