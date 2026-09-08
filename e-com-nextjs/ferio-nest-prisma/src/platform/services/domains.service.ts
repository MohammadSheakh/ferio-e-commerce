import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PlatformAuditService } from './platform-audit.service';
import { invalidateDomainCache } from '../utils/domain-cache-invalidation';
import { PlatformPrismaService } from '../platform-prisma.service';
import { EntitlementsService } from './entitlements.service';

/** Hosts that can never be tenant subdomains. */
export const RESERVED_SUBDOMAINS = new Set([
  'www',
  'admin',
  'api',
  'app',
  'platform',
  'mail',
  'ftp',
  'ferio',
  'status',
  'docs',
  'cdn',
]);

const HOSTNAME_LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

@Injectable()
export class DomainsService {
  constructor(
    private readonly platform: PlatformPrismaService,
    private readonly audit: PlatformAuditService,
    private readonly entitlements: EntitlementsService,
  ) {}

  /**
   * Reserve the default platform subdomain for an organization.
   * The resulting hostname is the only trusted storefront entry point until a
   * custom domain completes verification.
   */
  async reserveSubdomain(organizationId: string, slug: string) {
    const normalized = slug.trim().toLowerCase();
    if (
      !HOSTNAME_LABEL.test(normalized) ||
      RESERVED_SUBDOMAINS.has(normalized)
    ) {
      throw new ConflictException('SUBDOMAIN_RESERVED_OR_INVALID');
    }
    const baseDomain = (
      process.env.PLATFORM_PUBLIC_DOMAIN || 'ferio.local'
    ).replace(/^\.+/, '');
    const hostname = `${normalized}.${baseDomain}`;

    const organization = await this.platform.client.organization.findUnique({
      where: { id: organizationId },
    });
    if (!organization) throw new NotFoundException('ORGANIZATION_NOT_FOUND');

    try {
      const domain = await this.platform.client.tenantDomain.create({
        data: {
          hostname,
          type: 'PLATFORM_SUBDOMAIN',
          status: 'PENDING_ACTIVATION',
          isPrimary: true,
          organizationId,
        },
      });
      await this.audit.record({
        action: 'TENANT_DOMAIN_RESERVED',
        entityType: 'TenantDomain',
        entityId: domain.id,
        newValue: { hostname, organizationId },
      });
      invalidateDomainCache(hostname);
      return domain;
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('DOMAIN_HOSTNAME_TAKEN');
      }
      throw error;
    }
  }

  /** Activate a reserved platform subdomain only after tenant readiness. */
  async activatePlatformSubdomain(domainId: string, actorId?: string) {
    const domain = await this.platform.client.tenantDomain.findUnique({
      where: { id: domainId },
    });
    if (!domain) throw new NotFoundException('DOMAIN_NOT_FOUND');
    if (domain.type !== 'PLATFORM_SUBDOMAIN') {
      throw new ConflictException('DOMAIN_NOT_PLATFORM_SUBDOMAIN');
    }
    if (domain.status === 'ACTIVE') return domain;
    if (domain.status !== 'PENDING_ACTIVATION') {
      throw new ConflictException('DOMAIN_NOT_READY_FOR_ACTIVATION');
    }
    const updated = await this.platform.client.tenantDomain.update({
      where: { id: domainId },
      data: { status: 'ACTIVE' },
    });
    invalidateDomainCache(updated.hostname);
    await this.audit.record({
      action: 'TENANT_DOMAIN_ACTIVATED',
      entityType: 'TenantDomain',
      entityId: domainId,
      actorId,
      newValue: { hostname: domain.hostname },
    });
    return updated;
  }

  /**
   * Register a customer-owned custom domain. It stays PENDING_VERIFICATION
   * (and unresolvable for traffic) until verifyOwnership succeeds.
   */
  async addCustomDomain(organizationId: string, hostnameInput: string) {
    const hostname = this.normalizeHostname(hostnameInput);
    if (!hostname || !hostname.includes('.')) {
      throw new ConflictException('CUSTOM_DOMAIN_INVALID');
    }
    const decision = await this.entitlements.evaluate(
      organizationId,
      'custom_domain',
    );
    if (!decision.allowed) {
      throw new ForbiddenException(decision.code ?? 'FEATURE_DISABLED');
    }
    try {
      const verificationToken = `ferio-verify=${crypto.randomUUID()}`;
      const domain = await this.platform.client.tenantDomain.create({
        data: {
          hostname,
          type: 'CUSTOM',
          status: 'PENDING_VERIFICATION',
          isPrimary: false,
          organizationId,
          verificationToken,
        },
      });
      await this.audit.record({
        action: 'CUSTOM_DOMAIN_REQUESTED',
        entityType: 'TenantDomain',
        entityId: domain.id,
        newValue: { hostname, organizationId },
      });
      return { domain, verificationToken };
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('DOMAIN_HOSTNAME_TAKEN');
      }
      throw error;
    }
  }

  /** Ownership proof: TXT challenge match activates the domain. */
  async verifyOwnership(
    domainId: string,
    presentedToken: string,
    organizationId?: string,
  ) {
    const domain = await this.platform.client.tenantDomain.findUnique({
      where: { id: domainId },
    });
    if (!domain) throw new NotFoundException('DOMAIN_NOT_FOUND');
    if (organizationId && domain.organizationId !== organizationId) {
      throw new NotFoundException('DOMAIN_NOT_FOUND');
    }
    if (domain.status === 'ACTIVE') return domain;
    if (domain.status !== 'PENDING_VERIFICATION') {
      throw new ConflictException('DOMAIN_NOT_VERIFIABLE');
    }
    if (
      !domain.verificationToken ||
      domain.verificationToken !== presentedToken.trim()
    ) {
      await this.platform.client.tenantDomain.update({
        where: { id: domainId },
        data: { status: 'VERIFICATION_FAILED' },
      });
      throw new ConflictException('DOMAIN_VERIFICATION_MISMATCH');
    }
    const updated = await this.platform.client.tenantDomain.update({
      where: { id: domainId },
      data: { status: 'ACTIVE', verifiedAt: new Date() },
    });
    invalidateDomainCache(updated.hostname);
    await this.audit.record({
      action: 'CUSTOM_DOMAIN_VERIFIED',
      entityType: 'TenantDomain',
      entityId: domainId,
      newValue: { hostname: domain.hostname },
    });
    return updated;
  }

  async setPrimary(organizationId: string, domainId: string) {
    const domain = await this.platform.client.tenantDomain.findFirst({
      where: { id: domainId, organizationId },
    });
    if (!domain) throw new NotFoundException('DOMAIN_NOT_FOUND');
    if (domain.status !== 'ACTIVE') {
      throw new ConflictException('DOMAIN_NOT_ACTIVE');
    }
    await this.platform.client.$transaction([
      this.platform.client.tenantDomain.updateMany({
        where: { organizationId, isPrimary: true },
        data: { isPrimary: false },
      }),
      this.platform.client.tenantDomain.update({
        where: { id: domainId },
        data: { isPrimary: true },
      }),
    ]);
    return this.platform.client.tenantDomain.findUnique({
      where: { id: domainId },
    });
  }

  async disable(domainId: string, actorId?: string, organizationId?: string) {
    const domain = await this.platform.client.tenantDomain.findUnique({
      where: { id: domainId },
    });
    if (!domain) throw new NotFoundException('DOMAIN_NOT_FOUND');
    if (organizationId && domain.organizationId !== organizationId) {
      throw new NotFoundException('DOMAIN_NOT_FOUND');
    }
    invalidateDomainCache(domain.hostname);
    const updated = await this.platform.client.tenantDomain.update({
      where: { id: domainId },
      data: { status: 'DISABLED', isPrimary: false },
    });
    await this.audit.record({
      action: 'TENANT_DOMAIN_DISABLED',
      entityType: 'TenantDomain',
      entityId: domainId,
      actorId,
      previousValue: { status: domain.status },
      newValue: { status: 'DISABLED' },
    });
    return updated;
  }

  /**
   * Evict all domain-resolution entries for one organization after an
   * operator-side repair. The control plane owns the hostname list; the
   * tenancy module owns the cache implementation through the invalidation
   * hook, preserving the dependency direction.
   */
  async invalidateOrganizationCache(organizationId: string, actorId?: string) {
    const domains = await this.platform.client.tenantDomain.findMany({
      where: { organizationId },
      select: { hostname: true },
    });

    for (const domain of domains) {
      invalidateDomainCache(domain.hostname);
    }

    await this.audit.record({
      action: 'TENANT_DOMAIN_CACHE_INVALIDATED',
      entityType: 'Organization',
      entityId: organizationId,
      actorId,
      newValue: { hostnameCount: domains.length },
    });

    return { organizationId, hostnameCount: domains.length };
  }

  /**
   * Credential-free operator diagnostics for every registered domain. A
   * domain is healthy only when both its own state and its organization state
   * are ACTIVE; verification tokens are intentionally excluded from this
   * projection.
   */
  async health() {
    const rows = await this.platform.client.tenantDomain.findMany({
      orderBy: { hostname: 'asc' },
      select: {
        id: true,
        hostname: true,
        type: true,
        status: true,
        isPrimary: true,
        organization: { select: { id: true, name: true, status: true } },
      },
    });
    const byStatus = rows.reduce<Record<string, number>>((counts, row) => {
      counts[row.status] = (counts[row.status] ?? 0) + 1;
      return counts;
    }, {});

    const domains = rows.map((row) => ({
      id: row.id,
      hostname: row.hostname,
      type: row.type,
      status: row.status,
      isPrimary: row.isPrimary,
      organizationId: row.organization.id,
      organizationName: row.organization.name,
      organizationStatus: row.organization.status,
      healthy: row.status === 'ACTIVE' && row.organization.status === 'ACTIVE',
      issue:
        row.status !== 'ACTIVE'
          ? `DOMAIN_${row.status}`
          : row.organization.status !== 'ACTIVE'
            ? `ORGANIZATION_${row.organization.status}`
            : null,
    }));

    return {
      totalDomains: domains.length,
      healthyCount: domains.filter((domain) => domain.healthy).length,
      unhealthyCount: domains.filter((domain) => !domain.healthy).length,
      byStatus,
      domains,
    };
  }

  normalizeHostname(input: string): string {
    return input.trim().toLowerCase().replace(/\.$/, '');
  }
}
