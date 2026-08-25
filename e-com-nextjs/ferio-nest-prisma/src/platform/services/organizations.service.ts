import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { OrganizationStatus } from '../generated/platform-client';
import type { PlatformPrismaService } from '../platform-prisma.service';
import { PlatformAuditService } from './platform-audit.service';

/** Legal transitions of the organization lifecycle state machine. */
const ALLOWED_TRANSITIONS: Record<OrganizationStatus, OrganizationStatus[]> = {
  PROVISIONING: ['ACTIVE', 'PROVISIONING_FAILED'],
  PROVISIONING_FAILED: ['PROVISIONING'], // retry provisioning
  ACTIVE: ['SUSPENDED', 'CLOSURE_PENDING'],
  SUSPENDED: ['ACTIVE', 'CLOSURE_PENDING'],
  CLOSURE_PENDING: ['CLOSED', 'ARCHIVED', 'SUSPENDED'], // reversal allowed before destruction
  CLOSED: ['ARCHIVED'],
  ARCHIVED: [],
};

export interface CreateOrganizationInput {
  name: string;
  slug: string;
  ownerEmail: string;
  actorId?: string;
}

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly platform: PlatformPrismaService,
    private readonly audit: PlatformAuditService,
  ) {}

  async create(input: CreateOrganizationInput) {
    const slug = this.normalizeSlug(input.slug);
    if (!slug) {
      throw new ConflictException('ORGANIZATION_SLUG_INVALID');
    }
    try {
      const organization = await this.platform.client.organization.create({
        data: {
          name: input.name.trim(),
          slug,
          status: 'PROVISIONING',
        },
      });
      await this.platform.client.organizationMember.create({
        data: {
          organizationId: organization.id,
          email: input.ownerEmail.trim().toLowerCase(),
          role: 'OWNER',
        },
      });
      await this.audit.record({
        action: 'ORGANIZATION_CREATED',
        entityType: 'Organization',
        entityId: organization.id,
        actorId: input.actorId,
        newValue: { slug, name: organization.name },
      });
      return organization;
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new ConflictException('ORGANIZATION_SLUG_TAKEN');
      }
      throw error;
    }
  }

  async transition(
    organizationId: string,
    to: OrganizationStatus,
    options: { actorId?: string; reason?: string } = {},
  ) {
    const organization = await this.platform.client.organization.findUnique({
      where: { id: organizationId },
    });
    if (!organization) throw new NotFoundException('ORGANIZATION_NOT_FOUND');

    const allowed = ALLOWED_TRANSITIONS[organization.status] ?? [];
    if (!allowed.includes(to)) {
      throw new ConflictException(
        `ORGANIZATION_TRANSITION_INVALID:${organization.status}->${to}`,
      );
    }

    const [updated] = await this.platform.client.$transaction([
      this.platform.client.organization.update({
        where: { id: organizationId },
        data: { status: to },
      }),
      this.platform.client.organizationLifecycleEvent.create({
        data: {
          organizationId,
          fromStatus: organization.status,
          toStatus: to,
          actorId: options.actorId,
          reason: options.reason,
        },
      }),
    ]);

    await this.audit.record({
      action: 'ORGANIZATION_STATUS_CHANGED',
      entityType: 'Organization',
      entityId: organizationId,
      actorId: options.actorId,
      previousValue: { status: organization.status },
      newValue: { status: to },
      metadata: { reason: options.reason },
    });
    return updated;
  }

  async getById(organizationId: string) {
    const organization = await this.platform.client.organization.findUnique({
      where: { id: organizationId },
      include: {
        domains: true,
        databases: {
          select: {
            id: true,
            status: true,
            schemaVersion: true,
            lastHealthAt: true,
            lastHealthy: true,
            host: true,
            port: true,
            databaseName: true,
            username: true,
          },
        },
        subscription: { include: { plan: true } },
        members: true,
      },
    });
    if (!organization) throw new NotFoundException('ORGANIZATION_NOT_FOUND');
    return organization;
  }

  async list(params: { status?: OrganizationStatus; skip?: number; take?: number } = {}) {
    const [items, total] = await Promise.all([
      this.platform.client.organization.findMany({
        where: params.status ? { status: params.status } : undefined,
        orderBy: { createdAt: 'desc' },
        skip: params.skip ?? 0,
        take: Math.min(params.take ?? 50, 200),
      }),
      this.platform.client.organization.count({
        where: params.status ? { status: params.status } : undefined,
      }),
    ]);
    return { items, total };
  }

  private normalizeSlug(slug: string): string {
    return slug
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-{2,}/g, '-')
      .replace(/^-|-$/g, '');
  }
}
