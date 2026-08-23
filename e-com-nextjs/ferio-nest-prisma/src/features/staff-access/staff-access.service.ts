import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'node:crypto';
import type { UserPayload } from '@app/common';
import { PrismaService } from '@app/database';
import { AuditService } from '../audit/audit.service';
import { EmailService } from '../authentication/email/email.service';
import { InviteStaffDto, UpdateStaffAccessDto } from './staff-access.dto';

@Injectable()
export class StaffAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly email: EmailService,
    private readonly config: ConfigService,
  ) {}

  async list() {
    const [staff, pendingInvitations] = await Promise.all([
      this.prisma.user.findMany({
        where: {
          role: { in: [UserRole.admin, UserRole.staff] },
          isDeleted: false,
        },
        orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          staffAccessStatus: true,
          staffPermissions: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.staffAccessToken.findMany({
        where: {
          purpose: 'INVITE',
          consumedAt: null,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          permissions: true,
          expiresAt: true,
          createdAt: true,
        },
      }),
    ]);
    return { staff, pendingInvitations };
  }

  async invite(dto: InviteStaffDto, actor: UserPayload) {
    const email = dto.email.normalize('NFKC').trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existing) throw new ConflictException('A user already uses this email');

    const issued = await this.issueToken({
      email,
      name: dto.name.normalize('NFKC').trim(),
      permissions: [...new Set(dto.permissions)].sort(),
      purpose: 'INVITE',
      issuedByUserId: actor.userId,
      expiresInHours: this.config.get<number>('STAFF_INVITE_EXPIRY_HOURS', 48),
    });
    await this.email.sendStaffAccessEmail(email, issued.token, 'INVITE');
    await this.audit.record({
      action: 'STAFF_INVITED',
      entityType: 'StaffAccessToken',
      entityId: issued.record.id,
      actor,
      newValue: {
        permissions: issued.record.permissions,
        expiresAt: issued.record.expiresAt,
      },
    });
    return {
      invitation: issued.record,
      ...(process.env.NODE_ENV === 'development'
        ? { setupToken: issued.token }
        : {}),
    };
  }

  async acceptInvite(token: string, password: string) {
    const accessToken = await this.requireToken(token, 'INVITE');
    const passwordHash = await bcrypt.hash(password, 12);
    try {
      const user = await this.prisma.$transaction(async (transaction) => {
        await this.consumeToken(transaction, accessToken.id);
        const created = await transaction.user.create({
          data: {
            name: accessToken.name ?? accessToken.email.split('@')[0],
            email: accessToken.email,
            password: passwordHash,
            role: UserRole.staff,
            isEmailVerified: true,
            staffAccessStatus: 'active',
            staffPermissions: accessToken.permissions,
          },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            staffAccessStatus: true,
            staffPermissions: true,
          },
        });
        await transaction.staffAccessToken.update({
          where: { id: accessToken.id },
          data: { targetUserId: created.id },
        });
        return created;
      });
      return { user, message: 'Staff invitation accepted' };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('A user already uses this email');
      }
      throw error;
    }
  }

  async deactivate(userId: string, actor: UserPayload) {
    if (userId === actor.userId) {
      throw new BadRequestException('You cannot deactivate your own account');
    }
    const existing = await this.requireStaff(userId);
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        staffAccessStatus: 'inactive',
        staffSessionVersion: { increment: 1 },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        staffAccessStatus: true,
        staffPermissions: true,
      },
    });
    await this.audit.record({
      action: 'STAFF_DEACTIVATED',
      entityType: 'User',
      entityId: userId,
      actor,
      previousValue: { staffAccessStatus: existing.staffAccessStatus },
      newValue: { staffAccessStatus: updated.staffAccessStatus },
    });
    return updated;
  }

  async updateAccess(
    userId: string,
    dto: UpdateStaffAccessDto,
    actor: UserPayload,
  ) {
    if (userId === actor.userId) {
      throw new BadRequestException('You cannot change your own staff access');
    }
    const existing = await this.requireStaff(userId);
    const permissions = [...new Set(dto.permissions)].sort();
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        staffAccessStatus: dto.status,
        staffPermissions: permissions,
        staffSessionVersion: { increment: 1 },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        staffAccessStatus: true,
        staffPermissions: true,
      },
    });
    await this.audit.record({
      action: 'STAFF_ACCESS_UPDATED',
      entityType: 'User',
      entityId: userId,
      actor,
      previousValue: {
        staffAccessStatus: existing.staffAccessStatus,
        staffPermissions: existing.staffPermissions,
      },
      newValue: {
        staffAccessStatus: updated.staffAccessStatus,
        staffPermissions: updated.staffPermissions,
      },
    });
    return updated;
  }

  async issueReset(userId: string, actor: UserPayload) {
    const staff = await this.requireStaff(userId);
    const issued = await this.issueToken({
      email: staff.email,
      name: staff.name,
      permissions: staff.staffPermissions,
      purpose: 'RESET',
      targetUserId: staff.id,
      issuedByUserId: actor.userId,
      expiresInHours: this.config.get<number>('STAFF_RESET_EXPIRY_HOURS', 2),
    });
    await this.prisma.user.update({
      where: { id: staff.id },
      data: { staffSessionVersion: { increment: 1 } },
    });
    await this.email.sendStaffAccessEmail(staff.email, issued.token, 'RESET');
    await this.audit.record({
      action: 'STAFF_RESET_ISSUED',
      entityType: 'User',
      entityId: staff.id,
      actor,
      metadata: { expiresAt: issued.record.expiresAt },
    });
    return {
      reset: issued.record,
      ...(process.env.NODE_ENV === 'development'
        ? { setupToken: issued.token }
        : {}),
    };
  }

  async completeReset(token: string, password: string) {
    const accessToken = await this.requireToken(token, 'RESET');
    if (!accessToken.targetUserId) {
      throw new BadRequestException('Invalid staff access token');
    }
    const targetUserId = accessToken.targetUserId;
    const passwordHash = await bcrypt.hash(password, 12);
    await this.prisma.$transaction(async (transaction) => {
      await this.consumeToken(transaction, accessToken.id);
      await transaction.user.update({
        where: { id: targetUserId },
        data: {
          password: passwordHash,
          failedLoginAttempts: 0,
          lockUntil: null,
          staffSessionVersion: { increment: 1 },
        },
      });
    });
    return { message: 'Staff access reset completed' };
  }

  private async requireStaff(userId: string) {
    const staff = await this.prisma.user.findFirst({
      where: { id: userId, role: UserRole.staff, isDeleted: false },
      select: {
        id: true,
        name: true,
        email: true,
        staffAccessStatus: true,
        staffPermissions: true,
      },
    });
    if (!staff) throw new NotFoundException('Staff account not found');
    return staff;
  }

  private async requireToken(token: string, purpose: 'INVITE' | 'RESET') {
    const record = await this.prisma.staffAccessToken.findUnique({
      where: { tokenHash: this.hashToken(token) },
    });
    if (
      !record ||
      record.purpose !== purpose ||
      record.consumedAt ||
      record.expiresAt <= new Date()
    ) {
      throw new BadRequestException('Invalid or expired staff access token');
    }
    return record;
  }

  private async issueToken(input: {
    email: string;
    name: string;
    permissions: string[];
    purpose: 'INVITE' | 'RESET';
    targetUserId?: string;
    issuedByUserId: string;
    expiresInHours: number;
  }) {
    const token = randomBytes(32).toString('base64url');
    await this.prisma.staffAccessToken.updateMany({
      where: {
        email: input.email,
        purpose: input.purpose,
        consumedAt: null,
      },
      data: { consumedAt: new Date() },
    });
    const record = await this.prisma.staffAccessToken.create({
      data: {
        email: input.email,
        name: input.name,
        permissions: input.permissions,
        purpose: input.purpose,
        targetUserId: input.targetUserId,
        issuedByUserId: input.issuedByUserId,
        tokenHash: this.hashToken(token),
        expiresAt: new Date(Date.now() + input.expiresInHours * 3_600_000),
      },
      select: {
        id: true,
        name: true,
        email: true,
        permissions: true,
        purpose: true,
        targetUserId: true,
        expiresAt: true,
        createdAt: true,
      },
    });
    return { token, record };
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private async consumeToken(
    transaction: Prisma.TransactionClient,
    tokenId: string,
  ) {
    const consumed = await transaction.staffAccessToken.updateMany({
      where: {
        id: tokenId,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { consumedAt: new Date() },
    });
    if (consumed.count !== 1) {
      throw new BadRequestException('Invalid or expired staff access token');
    }
  }
}
