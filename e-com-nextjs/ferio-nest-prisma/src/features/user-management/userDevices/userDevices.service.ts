import {
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { PrismaClient, UserDevices } from '@prisma/client';
import { PrismaService } from '@app/database';
import { DeviceType } from './enums/TDevice.enum';
import { TenantDbService } from '../../../tenancy/tenant-db.service';

/**
 * UserDevices Service
 * 
 * Manages user devices for push notifications
 * Extends GenericService for CRUD operations
 */
@Injectable()
export class UserDevicesService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly tenantDb?: TenantDbService,
  ) {}

  private async db(): Promise<PrismaClient> {
    return this.tenantDb
      ? this.tenantDb.getOrLegacy(this.prisma)
      : this.prisma;
  }

  /**
   * Register or update device
   */
  async registerOrUpdateDevice(
    userId: string,
    fcmToken: string,
    deviceType: DeviceType,
    deviceName?: string,
  ): Promise<UserDevices> {
    const db = await this.db();
    const existingDevice = await db.userDevices.findFirst({
      where: { fcmToken, userId, isDeleted: false },
    });

    if (existingDevice) {
      return db.userDevices.update({
        where: { id: existingDevice.id },
        data: {
          lastActive: new Date(),
          deviceType,
          deviceName: deviceName || existingDevice.deviceName,
        },
      });
    }

    return db.userDevices.create({
      data: {
        userId,
        fcmToken,
        deviceType,
        deviceName,
        lastActive: new Date(),
      },
    });
  }

  /**
   * Get all devices for user
   */
  async getUserDevices(userId: string): Promise<UserDevices[]> {
    const db = await this.db();
    return db.userDevices.findMany({
      where: { userId, isDeleted: false },
      orderBy: { lastActive: 'desc' },
    });
  }

  /**
   * Get device by FCM token
   */
  async getDeviceByToken(fcmToken: string): Promise<UserDevices | null> {
    const db = await this.db();
    return db.userDevices.findFirst({
      where: { fcmToken, isDeleted: false },
    });
  }

  /**
   * Update last active timestamp
   */
  async updateLastActive(deviceId: string): Promise<UserDevices | null> {
    const db = await this.db();
    return db.userDevices.update({
      where: { id: deviceId },
      data: { lastActive: new Date() },
    });
  }

  /**
   * Remove device (soft delete)
   */
  async removeDevice(userId: string, deviceId: string): Promise<UserDevices | null> {
    const db = await this.db();
    const device = await db.userDevices.findFirst({
      where: { id: deviceId, userId, isDeleted: false },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    return db.userDevices.update({
      where: { id: deviceId },
      data: {
        isDeleted: true,
      },
    });
  }

  /**
   * Remove device by FCM token
   */
  async removeDeviceByToken(userId: string, fcmToken: string): Promise<void> {
    const db = await this.db();
    await db.userDevices.updateMany({
      where: { fcmToken, userId },
      data: {
        isDeleted: true,
      },
    });
  }

  /**
   * Get all active devices for user (for push notifications)
   */
  async getActiveDevices(userId: string): Promise<UserDevices[]> {
    const db = await this.db();
    return db.userDevices.findMany({
      where: { userId, pushEnabled: true, isDeleted: false },
    });
  }

  /**
   * Cleanup old inactive devices (older than 1 year)
   */
  async cleanupInactiveDevices(): Promise<number> {
    const db = await this.db();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const result = await db.userDevices.updateMany({
      where: {
        lastActive: { lt: oneYearAgo },
        isDeleted: false,
      },
      data: {
        isDeleted: true,
      },
    });

    return result.count;
  }

  /**
   * Enable/disable push notifications for device
   */
  async updatePushEnabled(
    userId: string,
    deviceId: string,
    enabled: boolean,
  ): Promise<UserDevices> {
    const db = await this.db();
    const device = await db.userDevices.findFirst({
      where: { id: deviceId, userId, isDeleted: false },
      select: { id: true },
    });
    if (!device) throw new NotFoundException('Device not found');

    return db.userDevices.update({
      where: { id: device.id },
      data: { pushEnabled: enabled },
    });
  }
}
