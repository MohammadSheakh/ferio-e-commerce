import {
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '@app/database';
import { TenantDbService } from '../../tenancy/tenant-db.service';
import type { PrismaClient } from '@prisma/client';import { AuditService } from '../audit/audit.service';
import type { UserPayload } from '@app/common';
import { assertTenantCommerceWritable } from '../../tenancy/commerce-write-guard.util';
import type {
  CheckStoreAvailabilityDto,
  CreateStoreLocationDto,
  StoreQueryDto,
  UpdateStoreLocationDto,
} from './dto/store-location.dto';

@Injectable()
export class StoreLocationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Optional() private readonly tenantDb?: TenantDbService,
  ) {}

  /**
   * MT-7: tenant client inside resolved contexts; explicit legacy fallback.
   */
  private async db(): Promise<PrismaClient> {
    const tenant = await this.tenantDb?.tryGet();
    return tenant ?? (this.prisma as PrismaClient);
  }
  async listPublicStores() {
    const db = await this.db();
    const stores = await db.warehouse.findMany({
      where: { isStore: true, isActive: true },
      select: {
        id: true,
        code: true,
        name: true,
        phone: true,
        email: true,
        district: true,
        area: true,
        address: true,
        latitude: true,
        longitude: true,
        operatingHours: true,
        operatingDays: true,
        pickupInstructions: true,
      },
      orderBy: { name: 'asc' },
    });
    return stores;
  }

  async checkStoreAvailability(dto: CheckStoreAvailabilityDto) {
    const db = await this.db();
    const store = await db.warehouse.findUnique({
      where: { id: dto.storeId },
      include: {
        inventory: {
          where: { variantId: { in: dto.variantIds } },
        },
      },
    });

    if (!store || !store.isStore || !store.isActive) {
      throw new NotFoundException('Selected store location is not available.');
    }

    const items = await Promise.all(
      dto.variantIds.map(async (variantId) => {
        const storeStock = store.inventory.find(
          (inv) => inv.variantId === variantId,
        );
        const storeAvailable = storeStock
          ? Math.max(0, storeStock.onHand - storeStock.reserved)
          : 0;

        // Check central hub stock if not in store
        const hubStock = await db.inventoryStock.findFirst({
          where: { variantId, warehouse: { code: 'MAIN' } },
        });
        const hubAvailable = hubStock
          ? Math.max(0, hubStock.onHand - hubStock.reserved)
          : 0;

        return {
          variantId,
          storeAvailable,
          hubAvailable,
          availableInStore: storeAvailable > 0,
        };
      }),
    );

    const allInStore = items.every((item) => item.availableInStore);

    return {
      storeId: store.id,
      storeName: store.name,
      address: store.address,
      allAvailableInStore: allInStore,
      statusMessage: allInStore
        ? 'In Stock — Ready for immediate pickup'
        : 'Stock transfer required from Central Hub (Est. 1-2 business days)',
      items,
    };
  }

  async listAdminStores(query?: StoreQueryDto) {
    const db = await this.db();
    const page = Math.max(1, Number(query?.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query?.limit) || 20));
    const skip = (page - 1) * limit;
    const search = query?.search?.trim();

    const where: any = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { code: { contains: search, mode: 'insensitive' } },
            { district: { contains: search, mode: 'insensitive' } },
            { area: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [items, total] = await Promise.all([
      db.warehouse.findMany({
        where,
        skip,
        take: limit,
        include: {
          _count: { select: { inventory: true, orders: true } },
        },
        orderBy: [{ isStore: 'desc' }, { name: 'asc' }],
      }),
      db.warehouse.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;
    return {
      items,
      results: items,
      data: items,
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

  async createStore(dto: CreateStoreLocationDto, actor: UserPayload) {
    assertTenantCommerceWritable();
    const db = await this.db();
    const existing = await db.warehouse.findUnique({
      where: { code: dto.code },
    });
    if (existing) {
      throw new ConflictException(`Store/Warehouse code '${dto.code}' already exists.`);
    }

    const store = await db.warehouse.create({
      data: {
        code: dto.code,
        name: dto.name,
        isStore: true,
        isActive: dto.isActive ?? true,
        phone: dto.phone,
        email: dto.email,
        district: dto.district,
        area: dto.area,
        address: dto.address,
        latitude: dto.latitude,
        longitude: dto.longitude,
        operatingHours: dto.operatingHours,
        operatingDays: dto.operatingDays,
        pickupInstructions: dto.pickupInstructions,
      },
    });

    await this.audit.record({
      action: 'STORE_LOCATION_CREATED',
      entityType: 'Warehouse',
      entityId: store.id,
      actor: { userId: actor.userId || (actor as any).sub, role: actor.role },
      metadata: { storeName: store.name, code: store.code },
    });

    return store;
  }

  async updateStore(
    id: string,
    dto: UpdateStoreLocationDto,
    actor: UserPayload,
  ) {
    assertTenantCommerceWritable();
    const db = await this.db();
    const existing = await db.warehouse.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Store location with ID '${id}' not found.`);
    }

    const updated = await db.warehouse.update({
      where: { id },
      data: dto,
    });

    await this.audit.record({
      action: 'STORE_LOCATION_UPDATED',
      entityType: 'Warehouse',
      entityId: updated.id,
      actor: { userId: actor.userId || (actor as any).sub, role: actor.role },
      metadata: { changes: dto },
    });

    return updated;
  }

  async deleteStore(id: string, actor: UserPayload) {
    assertTenantCommerceWritable();
    const db = await this.db();
    const existing = await db.warehouse.findUnique({
      where: { id },
      include: { _count: { select: { orders: true } } },
    });

    if (!existing) {
      throw new NotFoundException(`Store location with ID '${id}' not found.`);
    }

    if (existing._count.orders > 0) {
      throw new ConflictException(
        `Cannot delete store '${existing.name}' because it has linked orders. Deactivate it instead.`,
      );
    }

    await db.warehouse.delete({ where: { id } });

    await this.audit.record({
      action: 'STORE_LOCATION_DELETED',
      entityType: 'Warehouse',
      entityId: id,
      actor: { userId: actor.userId || (actor as any).sub, role: actor.role },
      metadata: { storeName: existing.name },
    });

    return { success: true };
  }
}
