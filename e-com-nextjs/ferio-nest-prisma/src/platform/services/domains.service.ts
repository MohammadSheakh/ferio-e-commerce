import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PlatformAuditService } from './platform-audit.service';
import type { PlatformPrismaService } from '../platform-prisma.service';

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
  ) {}

  /**
   * Reserve the default platform subdomain for an organization.
   * The resulting hostname is the only trusted storefront entry point until a
   * custom domain completes verification.
   */
  async reserveSubdomain(organizationId: string, slug: string) {
    const normalized = slug.trim().toLowerCase();
    if (!HOSTNAME_LABEL.test(normalized) || RESERVED_SUBDOMAINS.has(normalized)) {
      throw new ConflictException('SUBDOMAIN_RESERVED_OR_INVALID');
    }
    const baseDomain = (process.env.PLATFORM_PUBLIC_DOMAIN || 'ferio.local').replace(/^\.+/, '');
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
          status: 'ACTIVE',
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
      return domain;
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new ConflictException('DOMAIN_HOSTNAME_TAKEN');
      }
      throw error;
    }
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
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new ConflictException('DOMAIN_HOSTNAME_TAKEN');
      }
      throw error;
    }
  }

  /** Ownership proof: TXT challenge match activates the domain. */
  async verifyOwnership(domainId: string, presentedToken: string) {
    const domain = await this.platform.client.tenantDomain.findUnique({ where: { id: domainId } });
    if (!domain) throw new NotFoundException('DOMAIN_NOT_FOUND');
    if (domain.status === 'ACTIVE') return domain;
    if (domain.status !== 'PENDING_VERIFICATION') {
      throw new ConflictException('DOMAIN_NOT_VERIFIABLE');
    }
    if (!domain.verificationToken || domain.verificationToken !== presentedToken.trim()) {
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
    return this.platform.client.tenantDomain.findUnique({ where: { id: domainId } });
  }

  async disable(domainId: string, actorId?: string) {
    const domain = await this.platform.client.tenantDomain.findUnique({ where: { id: domainId } });
    if (!domain) throw new NotFoundException('DOMAIN_NOT_FOUND');
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

  normalizeHostname(input: string): string {
    return input
      .trim()
      .toLowerCase()
      .replace(/\.$/, '');
  }
}
