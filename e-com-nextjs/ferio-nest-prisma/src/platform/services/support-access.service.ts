import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PlatformPrismaService } from '../platform-prisma.service';
import { PlatformAuditService } from './platform-audit.service';
import { toPlatformJsonInput } from '../utils/json-input.util';

export type SupportAccessAction = 'read' | 'write' | 'export';
export type SupportAccessScope = Record<string, SupportAccessAction>;

const SUPPORT_SCOPE_RESOURCES = new Set([
  'customers',
  'media',
  'orders',
  'payments',
  'reports',
  'settings',
]);
const SUPPORT_SCOPE_ACTIONS = new Set<SupportAccessAction>([
  'read',
  'write',
  'export',
]);

/**
 * Support access is never implicit (ADR-0004): every grant is reason-bound,
 * time-bound, scoped, audited, and revocable. Absent an active grant,
 * platform operators have zero tenant-data access.
 */
@Injectable()
export class SupportAccessService {
  constructor(
    private readonly platform: PlatformPrismaService,
    private readonly audit: PlatformAuditService,
  ) {}

  async grant(input: {
    organizationId: string;
    platformUserId: string;
    reason: string;
    scope?: Record<string, unknown>;
    ttlMinutes?: number;
    actorId?: string;
  }) {
    if (!input.reason || input.reason.trim().length < 10) {
      throw new ConflictException('SUPPORT_ACCESS_REASON_REQUIRED');
    }
    const ttl = Math.min(Math.max(input.ttlMinutes ?? 60, 5), 8 * 60);
    const scope = this.normalizeScope(input.scope);
    const record = await this.platform.client.supportAccessGrant.create({
      data: {
        organizationId: input.organizationId,
        platformUserId: input.platformUserId,
        reason: input.reason.trim(),
        scope: toPlatformJsonInput(scope),
        expiresAt: new Date(Date.now() + ttl * 60 * 1000),
      },
    });
    await this.audit.record({
      action: 'SUPPORT_ACCESS_GRANTED',
      entityType: 'SupportAccessGrant',
      entityId: record.id,
      actorId: input.actorId ?? input.platformUserId,
      newValue: {
        organizationId: input.organizationId,
        expiresAt: record.expiresAt,
        scope,
      },
      metadata: { reason: input.reason.trim() },
    });
    return record;
  }

  /** Throws unless an unexpired, unrevoked grant exists for this pairing. */
  async assertActive(
    organizationId: string,
    platformUserId: string,
    requiredScope?: { resource: string; action: SupportAccessAction },
  ) {
    const grant = await this.platform.client.supportAccessGrant.findFirst({
      where: {
        organizationId,
        platformUserId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!grant) throw new NotFoundException('SUPPORT_ACCESS_REQUIRED');
    if (
      requiredScope &&
      !this.scopeAllows(
        grant.scope,
        requiredScope.resource,
        requiredScope.action,
      )
    ) {
      throw new ForbiddenException('SUPPORT_ACCESS_SCOPE_REQUIRED');
    }
    await this.audit.record({
      action: 'SUPPORT_ACCESS_USED',
      entityType: 'SupportAccessGrant',
      entityId: grant.id,
      actorId: platformUserId,
      metadata: {
        organizationId,
        ...(requiredScope ? { requiredScope } : {}),
      },
    });
    return grant;
  }

  async revoke(grantId: string, actorId?: string) {
    const grant = await this.platform.client.supportAccessGrant.findUnique({
      where: { id: grantId },
    });
    if (!grant) throw new NotFoundException('SUPPORT_GRANT_NOT_FOUND');
    if (grant.revokedAt) return grant;
    const updated = await this.platform.client.supportAccessGrant.update({
      where: { id: grantId },
      data: { revokedAt: new Date() },
    });
    await this.audit.record({
      action: 'SUPPORT_ACCESS_REVOKED',
      entityType: 'SupportAccessGrant',
      entityId: grantId,
      actorId,
    });
    return updated;
  }

  countActive(): Promise<number> {
    return this.platform.client.supportAccessGrant.count({
      where: { revokedAt: null, expiresAt: { gt: new Date() } },
    });
  }

  /** Platform-wide listing (optionally filtered) for the console. */
  listActive(organizationId?: string) {
    return this.platform.client.supportAccessGrant.findMany({
      where: {
        revokedAt: null,
        expiresAt: { gt: new Date() },
        ...(organizationId ? { organizationId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  listActiveForOrganization(organizationId: string) {
    return this.platform.client.supportAccessGrant.findMany({
      where: { organizationId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
  }

  private normalizeScope(
    scope: Record<string, unknown> | undefined,
  ): SupportAccessScope {
    if (!scope) return {};
    const entries = Object.entries(scope);
    if (entries.length > SUPPORT_SCOPE_RESOURCES.size) {
      throw new BadRequestException('SUPPORT_ACCESS_SCOPE_INVALID');
    }
    const normalized: SupportAccessScope = {};
    for (const [resource, action] of entries) {
      if (
        !SUPPORT_SCOPE_RESOURCES.has(resource) ||
        typeof action !== 'string' ||
        !SUPPORT_SCOPE_ACTIONS.has(action as SupportAccessAction)
      ) {
        throw new BadRequestException('SUPPORT_ACCESS_SCOPE_INVALID');
      }
      normalized[resource] = action as SupportAccessAction;
    }
    return normalized;
  }

  private scopeAllows(
    scope: unknown,
    resource: string,
    action: SupportAccessAction,
  ): boolean {
    if (!SUPPORT_SCOPE_RESOURCES.has(resource)) return false;
    if (!scope || typeof scope !== 'object' || Array.isArray(scope))
      return false;
    const granted = (scope as Record<string, unknown>)[resource];
    return granted === action || (granted === 'write' && action === 'read');
  }
}
