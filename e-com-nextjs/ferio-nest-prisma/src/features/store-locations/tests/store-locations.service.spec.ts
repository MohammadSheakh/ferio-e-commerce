import { Test, TestingModule } from '@nestjs/testing';
import type { UserPayload } from '@app/common';
import { StoreLocationsService } from '../store-locations.service';
import { PrismaService } from '@app/database';
import { AuditService } from '../../audit/audit.service';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('StoreLocationsService', () => {
  let service: StoreLocationsService;
  let prisma: PrismaService;
  let audit: AuditService;

  const mockAdminActor = {
    userId: 'admin-1',
    email: 'admin@ferio.com',
    role: 'admin' as const,
  };

  const mockStore = {
    id: 'store-1',
    code: 'STORE-DHN',
    name: 'Ferio Dhanmondi Flagship Store',
    isStore: true,
    isActive: true,
    phone: '+8801700000001',
    address: 'House 42, Road 11/A, Dhanmondi, Dhaka',
    operatingHours: '10:00 AM - 08:30 PM',
    inventory: [
      { variantId: 'var-1', onHand: 10, reserved: 2, damaged: 0 },
    ],
  };

  const mockPrisma = {
    warehouse: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    inventoryStock: {
      findFirst: jest.fn(),
    },
  };

  const mockAudit = {
    record: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StoreLocationsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get<StoreLocationsService>(StoreLocationsService);
    prisma = module.get<PrismaService>(PrismaService);
    audit = module.get<AuditService>(AuditService);
    jest.clearAllMocks();
  });

  describe('listPublicStores', () => {
    it('should return active store locations for public checkout selection', async () => {
      mockPrisma.warehouse.findMany.mockResolvedValue([mockStore]);
      const result = await service.listPublicStores();
      expect(result).toHaveLength(1);
      expect(result[0].code).toBe('STORE-DHN');
    });
  });

  describe('checkStoreAvailability', () => {
    it('should return availableInStore true when store has sufficient stock', async () => {
      mockPrisma.warehouse.findUnique.mockResolvedValue(mockStore);
      const result = await service.checkStoreAvailability({
        storeId: 'store-1',
        variantIds: ['var-1'],
      });
      expect(result.allAvailableInStore).toBe(true);
      expect(result.items[0].storeAvailable).toBe(8);
      expect(result.statusMessage).toContain('Ready for immediate pickup');
    });

    it('should return availableInStore false and indicate transfer required when store lacks stock', async () => {
      const outOfStockStore = {
        ...mockStore,
        inventory: [{ variantId: 'var-1', onHand: 0, reserved: 0, damaged: 0 }],
      };
      mockPrisma.warehouse.findUnique.mockResolvedValue(outOfStockStore);
      mockPrisma.inventoryStock.findFirst.mockResolvedValue({
        onHand: 20,
        reserved: 5,
      });

      const result = await service.checkStoreAvailability({
        storeId: 'store-1',
        variantIds: ['var-1'],
      });
      expect(result.allAvailableInStore).toBe(false);
      expect(result.statusMessage).toContain('Stock transfer required');
    });
  });

  describe('createStore', () => {
    it('should throw ConflictException if store code already exists', async () => {
      mockPrisma.warehouse.findUnique.mockResolvedValue(mockStore);
      await expect(
        service.createStore(
          { code: 'STORE-DHN', name: 'Duplicate Store' },
          mockAdminActor,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should create new physical store and record audit log', async () => {
      mockPrisma.warehouse.findUnique.mockResolvedValue(null);
      mockPrisma.warehouse.create.mockResolvedValue(mockStore);

      const result = await service.createStore(
        { code: 'STORE-DHN', name: 'Ferio Dhanmondi Flagship Store' },
        mockAdminActor,
      );

      expect(result.id).toBe('store-1');
      expect(mockAudit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'STORE_LOCATION_CREATED' }),
      );
    });
  });
});
