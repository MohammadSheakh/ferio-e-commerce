import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PlatformPrismaService } from '../platform-prisma.service';
import { OrganizationsService } from './organizations.service';
import { DomainsService } from './domains.service';
import { TenantDatabasesService } from './tenant-databases.service';
import { PlatformAuditService } from './platform-audit.service';

/** PO-013: minimum recoverable period before final destruction. */
const CLOSURE_RETENTION_DAYS = 90;

/**
 * Tenant closure workflow (ADR-0007, checklist §15.3).
 *
 * Stages implemented here:
 *  1. initiateClosure  — CLOSURE_PENDING + all domains disabled (preventing
 *     takeover/reassignment) + audited.
 *  2. finalizeClosure   — retires the tenant database registry and marks the
 *     organization CLOSED. Physical destruction is an infrastructure step
 *     (owner-blocked hosting/retention decision) and is intentionally NOT
 *     performed here; the registry retirement makes the tenant unreachable.
 *
 * Retention: destructive steps are blocked while CLOSURE_PENDING is younger
 * than the configured retention window (ADR-0007 proposal: 90 days,
 * owner-blocked). Export package generation lands with the export workflow
 * and is required before finalize in production policy.
 */
@Injectable()
export class TenantClosureService {
  constructor(
    private readonly platform: PlatformPrismaService,
    private readonly organizations: OrganizationsService,
    private readonly domains: DomainsService,
    private readonly databases: TenantDatabasesService,
    private readonly audit: PlatformAuditService,
  ) {}

  async initiateClosure(
    organizationId: string,
    options: { actorId?: string; reason?: string },
  ): Promise<void> {
    const organization = await this.platform.client.organization.findUnique({
      where: { id: organizationId },
      include: { domains: true },
    });
    if (!organization) throw new NotFoundException('ORGANIZATION_NOT_FOUND');
    if (!['ACTIVE', 'SUSPENDED'].includes(organization.status)) {
      throw new ConflictException('ORGANIZATION_NOT_CLOSABLE');
    }

    await this.organizations.transition(organizationId, 'CLOSURE_PENDING', {
      actorId: options.actorId,
      reason: options.reason ?? 'closure requested',
    });

    // Revoke every domain immediately so a lapsed business's hostname cannot
    // be re-claimed or re-pointed at Ferio infrastructure mid-closure.
    for (const domain of organization.domains) {
      if (domain.status !== 'DISABLED') {
        await this.domains.disable(domain.id, options.actorId);
      }
    }

    await this.audit.record({
      action: 'TENANT_CLOSURE_INITIATED',
      entityType: 'Organization',
      entityId: organizationId,
      actorId: options.actorId,
      metadata: { reason: options.reason, domainsRevoked: organization.domains.length },
    });
  }

  async finalizeClosure(
    organizationId: string,
    options: {
      actorId?: string;
      /** Confirms export/legal steps are done. */
      retentionAcknowledged?: boolean;
      /** Explicit early-destruction override inside the 90-day window. */
      overrideRetentionPeriod?: boolean;
    },
  ): Promise<void> {
    const organization = await this.platform.client.organization.findUnique({
      where: { id: organizationId },
      include: { databases: true, lifecycleEvents: true },
    });
    if (!organization) throw new NotFoundException('ORGANIZATION_NOT_FOUND');
    if (organization.status !== 'CLOSURE_PENDING') {
      throw new ConflictException('ORGANIZATION_NOT_IN_CLOSURE');
    }

    // PO-013: a 90-day recoverable period runs from the CLOSURE_PENDING
    // transition. Finalizing inside the window requires an explicit
    // operator override (audited); silence never destroys data.
    const closureEvent = organization.lifecycleEvents
      .filter((e) => e.toStatus === 'CLOSURE_PENDING')
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
    const closureStartedAt = closureEvent?.createdAt ?? new Date();
    const retentionEndsAt =
      closureStartedAt.getTime() + CLOSURE_RETENTION_DAYS * 24 * 60 * 60 * 1000;
    const insideRetentionWindow = Date.now() < retentionEndsAt;
    if (insideRetentionWindow && !options.overrideRetentionPeriod) {
      throw new ConflictException(
        `CLOSURE_RETENTION_PERIOD_ACTIVE:${closureEvent ? closureEvent.createdAt.toISOString() : 'unknown'}`,
      );
    }

    // Retire every database registration; the connection manager refuses
    // retired registries, making the tenant unreachable platform-wide.
    for (const database of organization.databases) {
      if (database.status !== 'RETIRED') {
        await this.platform.client.tenantDatabase.update({
          where: { id: database.id },
          data: { status: 'RETIRED' },
        });
        await this.audit.record({
          action: 'TENANT_DATABASE_RETIRED',
          entityType: 'TenantDatabase',
          entityId: database.id,
          actorId: options.actorId,
          newValue: { organizationId },
        });
      }
    }

    await this.organizations.transition(organizationId, 'CLOSED', {
      actorId: options.actorId,
      reason: options.retentionAcknowledged ? 'retention acknowledged' : undefined,
    });
  }
}
