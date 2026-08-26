import { HttpStatus, Injectable, type NestMiddleware, type OnModuleInit } from '@nestjs/common';
import { isIP } from 'node:net';
import type { NextFunction, Request, Response } from 'express';
import { RedisService } from '@app/redis';
import { PlatformPrismaService } from '../platform/platform-prisma.service';
import {
  normalizeTenantHost,
  TenantResolutionException,
} from './tenant-errors';
import { runWithTenantContext, type TenantDatabaseMaterial } from './tenant-context';
import { setDomainCacheInvalidator } from '../platform/utils/domain-cache-invalidation';
import { TenantMetrics } from '@app/common';

const POSITIVE_CACHE_TTL_SECONDS = 60;
const NEGATIVE_CACHE_TTL_SECONDS = 15;

export interface ResolvedTenant {
  organizationId: string;
  tenantDatabaseId: string;
  database: TenantDatabaseMaterial;
  domainId: string;
  hostname: string;
  subscriptionStatus: 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'SUSPENDED' | 'CANCELLED';
}

/**
 * Trusted tenant resolution (ADR-0002). The request host is the ONLY routing
 * input; the control-plane registry is the ONLY source of truth. Every
 * failure mode fails closed — resolution failures never fall back to the
 * legacy single-tenant database.
 */
@Injectable()
export class TenantResolverService implements OnModuleInit {
  constructor(
    private readonly platform: PlatformPrismaService,
    private readonly redis: RedisService,
  ) {}

  /** Control-plane domain mutations drop this resolver's cached entries. */
  onModuleInit(): void {
    setDomainCacheInvalidator((hostname) => this.invalidate(hostname));
  }

  /**
   * Select a host without trusting client-supplied forwarding metadata.
   * Forwarded hosts are accepted only from the configured ingress/BFF CIDRs.
   */
  effectiveHostFrom(headersOrRequest: {
    headers?: Record<string, string | string[] | undefined>;
    hostname?: string;
    remoteAddress?: string;
  }): string | undefined {
    const headers = headersOrRequest.headers;
    const forwarded = headers?.['x-forwarded-host'];
    if (forwarded !== undefined) {
      const forwardedHost = this.singleForwardedHost(forwarded);
      if (!this.isTrustedProxy(headersOrRequest.remoteAddress)) {
        throw new TenantResolutionException(
          'TENANT_FORWARDED_HOST_UNTRUSTED',
          HttpStatus.BAD_REQUEST,
        );
      }
      return forwardedHost;
    }
    return headersOrRequest.hostname;
  }

  private singleForwardedHost(value: string | string[]): string {
    if (Array.isArray(value) && value.length !== 1) {
      throw new TenantResolutionException('TENANT_HOST_INVALID', HttpStatus.BAD_REQUEST);
    }
    const host = Array.isArray(value) ? value[0] : value;
    // Forwarded chains are ambiguous for tenant selection. The trusted edge
    // must overwrite, never append, this header.
    if (!host || host.includes(',')) {
      throw new TenantResolutionException('TENANT_HOST_INVALID', HttpStatus.BAD_REQUEST);
    }
    return host;
  }

  private isTrustedProxy(remoteAddress: string | undefined): boolean {
    if (!remoteAddress) return false;
    const configured = process.env.TENANT_TRUSTED_PROXY_CIDRS?.trim();
    const ranges = configured
      ? configured.split(',').map((value) => value.trim()).filter(Boolean)
      : process.env.NODE_ENV === 'production'
        ? []
        : ['127.0.0.1/32', '::1/128'];
    return ranges.some((range) => addressInCidr(remoteAddress, range));
  }

  async resolveFromHost(rawHost: string | undefined): Promise<ResolvedTenant> {
    const hostname = normalizeTenantHost(rawHost);

    const cached = await this.readCache(hostname);
    if (cached === null) {
      // Negative cache hit: recently-proven-unknown host.
      TenantMetrics.increment('resolver_unknown_domain', { hostname });
      throw new TenantResolutionException('TENANT_RESOLUTION_FAILED');
    }
    if (cached) return cached;

    let resolved: ResolvedTenant;
    try {
      resolved = await this.resolveFromControlPlane(hostname);
    } catch (error) {
      // Stable codes at the boundary: infrastructure outages must never leak
      // driver errors to callers, must fail closed, and must NOT be
      // negatively cached (an outage is not an answer).
      if (error instanceof TenantResolutionException) throw error;
      TenantMetrics.increment('resolver_failed', { hostname });
      throw new TenantResolutionException('TENANT_RESOLUTION_FAILED');
    }
    await this.writeCache(hostname, resolved);
    return resolved;
  }

  private async resolveFromControlPlane(hostname: string): Promise<ResolvedTenant> {
    const domain = await this.platform.client.tenantDomain.findUnique({
      where: { hostname },
      include: {
        organization: {
          include: { subscription: true },
        },
      },
    });

    if (!domain || domain.status !== 'ACTIVE') {
      TenantMetrics.increment('resolver_unknown_domain', { hostname });
      // Definitive "no active tenant here": cache it so hostile/garbage
      // host storms cannot reach the control plane. Only true unknowns are
      // negatively cached — control-plane outages never are.
      await this.writeNegative(hostname);
      throw new TenantResolutionException('TENANT_RESOLUTION_FAILED');
    }

    const organization = domain.organization;
    // PO-005: a suspended business stays BROWSABLE — the storefront renders,
    // checkout is disabled at the commerce layer, and admins can still sign
    // in to view/export/renew. Only closure/closed states take the store
    // fully offline (fail-closed below).
    if (
      ['CLOSURE_PENDING', 'CLOSED', 'ARCHIVED', 'PROVISIONING_FAILED'].includes(
        organization.status,
      )
    ) {
      TenantMetrics.increment('resolver_suspended', { hostname });
      throw new TenantResolutionException('TENANT_SUSPENDED', HttpStatus_SERVICE_UNAVAILABLE);
    }

    const registry = await this.platform.client.tenantDatabase.findUnique({
      where: { organizationId: organization.id },
    });
    if (!registry || registry.status === 'RETIRED') {
      TenantMetrics.increment('resolver_tenant_unavailable', { hostname });
      throw new TenantResolutionException('TENANT_UNAVAILABLE', HttpStatus_SERVICE_UNAVAILABLE);
    }
    if (registry.status === 'MIGRATION_REQUIRED') {
      TenantMetrics.increment('resolver_migration_required', { hostname });
      throw new TenantResolutionException(
        'TENANT_MIGRATION_REQUIRED',
        HttpStatus_SERVICE_UNAVAILABLE,
      );
    }
    if (registry.status !== 'READY') {
      TenantMetrics.increment('resolver_tenant_unavailable', { hostname });
      throw new TenantResolutionException('TENANT_UNAVAILABLE', HttpStatus_SERVICE_UNAVAILABLE);
    }

    return {
      organizationId: organization.id,
      tenantDatabaseId: registry.id,
      database: {
        id: registry.id,
        host: registry.host,
        port: registry.port,
        databaseName: registry.databaseName,
        username: registry.username,
        credentialCipher: registry.credentialCipher,
      },
      domainId: domain.id,
      hostname,
      subscriptionStatus:
        (organization.subscription?.status as ResolvedTenant['subscriptionStatus']) ?? 'TRIALING',
    };
  }

  /** Invalidate cached mapping when domains/organizations change. */
  async invalidate(hostname: string): Promise<void> {
    try {
      const client = await this.redis.getClient();
      if (!client) return;
      await Promise.all([
        client.del(this.positiveKey(hostname)),
        client.del(this.negativeKey(hostname)),
      ]);
    } catch {
      // Best-effort; TTL bounds staleness regardless.
    }
  }

  private async writeNegative(hostname: string): Promise<void> {
    try {
      const client = await this.redis.getClient();
      if (!client) return;
      await client.set(
        this.negativeKey(hostname),
        '1',
        'EX',
        NEGATIVE_CACHE_TTL_SECONDS,
      );
    } catch {
      // Best-effort; an uncached miss just costs one lookup.
    }
  }

  private async readCache(hostname: string): Promise<ResolvedTenant | null | undefined> {
    try {
      const client = await this.redis.getClient();
      if (!client) return undefined;
      const [positiveRaw, negativeRaw] = await Promise.all([
        client.get(this.positiveKey(hostname)),
        client.get(this.negativeKey(hostname)),
      ]);
      if (negativeRaw) return null;
      return positiveRaw ? (JSON.parse(positiveRaw) as ResolvedTenant) : undefined;
    } catch {
      return undefined; // Redis unavailable → resolve straight from control plane.
    }
  }

  private async writeCache(hostname: string, value: ResolvedTenant): Promise<void> {
    try {
      const client = await this.redis.getClient();
      if (!client) return;
      await client.set(
        this.positiveKey(hostname),
        JSON.stringify(value),
        'EX',
        POSITIVE_CACHE_TTL_SECONDS,
      );
    } catch {
      // Best-effort caching only.
    }
  }

  // Cache keys ARE the trusted hostname — identical hosts across tenants are
  // impossible by definition, so no cross-tenant cache collision can occur.
  private positiveKey(hostname: string) {
    return `tenant:host:${hostname}`;
  }

  private negativeKey(hostname: string) {
    return `tenant:host:neg:${hostname}`;
  }
}

const HttpStatus_SERVICE_UNAVAILABLE = 503;

/**
 * Middleware that resolves the tenant before any route executes and wraps the
 * downstream chain in the immutable TenantContext.
 */
@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  constructor(private readonly resolver: TenantResolverService) {}

  use(request: Request, response: Response, next: NextFunction) {
    // Staged rollout (MT-2): until TENANCY_ENABLED=true, requests pass through
    // without tenant context and commerce keeps using its current database.
    // When enabled, resolution is strict — unknown/suspended hosts fail closed.
    if ((process.env.TENANCY_ENABLED || 'false') !== 'true') {
      next();
      return;
    }
    const effectiveHost = this.resolver.effectiveHostFrom({
      headers: request.headers as Record<string, string | string[] | undefined>,
      hostname: request.hostname,
      // Read the TCP peer directly. Express trust-proxy settings must never
      // influence the decision about whether forwarding headers are trusted.
      remoteAddress: request.socket?.remoteAddress,
    });
    this.resolver
      .resolveFromHost(effectiveHost)
      .then((resolved) => {
        (request as Request & { tenantOrganizationId?: string }).tenantOrganizationId =
          resolved.organizationId;
        runWithTenantContext(
          {
            organizationId: resolved.organizationId,
            tenantDatabaseId: resolved.tenantDatabaseId,
            database: resolved.database,
            domainId: resolved.domainId,
            hostname: resolved.hostname,
            subscriptionStatus: resolved.subscriptionStatus,
          },
          next,
        );
      })
      .catch(next);
  }
}

function addressInCidr(rawAddress: string, rawRange: string): boolean {
  const address = rawAddress.startsWith('::ffff:')
    ? rawAddress.slice('::ffff:'.length)
    : rawAddress;
  const [network, prefixText] = rawRange.split('/');
  const addressVersion = isIP(address);
  const networkVersion = isIP(network);
  if (!addressVersion || addressVersion !== networkVersion) return false;

  if (addressVersion === 6) {
    const prefix = prefixText === undefined ? 128 : Number(prefixText);
    // Exact IPv6 entries cover loopback and fixed ingress addresses. Broader
    // IPv6 proxy networks should be terminated at an IPv4/private edge until
    // a full IPv6 CIDR library is deliberately introduced.
    return prefix === 128 && address.toLowerCase() === network.toLowerCase();
  }

  const prefix = prefixText === undefined ? 32 : Number(prefixText);
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) return false;
  const addressInt = ipv4ToInt(address);
  const networkInt = ipv4ToInt(network);
  if (addressInt === null || networkInt === null) return false;
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return (addressInt & mask) === (networkInt & mask);
}

function ipv4ToInt(value: string): number | null {
  const octets = value.split('.').map(Number);
  if (
    octets.length !== 4 ||
    octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)
  ) {
    return null;
  }
  return octets.reduce((result, octet) => ((result << 8) | octet) >>> 0, 0);
}
