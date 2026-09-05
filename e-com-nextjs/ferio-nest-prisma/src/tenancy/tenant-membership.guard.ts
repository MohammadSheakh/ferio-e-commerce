import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Redis } from 'ioredis';
import type { PrismaClient } from '../platform/generated/platform-client';
import type { RedisService } from '@app/redis';
import type { Request } from 'express';
import { getTenantContext } from './tenant-context';

export interface TenantMembershipInfo {
  membershipId: string;
  role: 'OWNER' | 'STAFF';
}

interface MemberRow {
  id: string;
  email: string;
  isActive: boolean;
  role: 'OWNER' | 'STAFF';
}

interface MembershipInvalidation {
  organizationId?: string;
  email?: string;
}

type TenantMembershipRequest = Request & {
  user?: { email?: unknown };
  platformPrincipal?: { email?: unknown };
  tenantMembership?: TenantMembershipInfo;
};

function isMembershipInvalidation(
  value: unknown,
): value is MembershipInvalidation {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    (record.organizationId === undefined ||
      typeof record.organizationId === 'string') &&
    (record.email === undefined || typeof record.email === 'string')
  );
}

/**
 * Binds authenticated staff sessions to the resolved organization's
 * membership roster (MT-2 §5.3 / ADR-0004).
 *
 * Enforcement semantics:
 * - Legacy mode (`TENANCY_ENABLED=false`): passthrough — existing deployments
 *   and their authorization model are untouched.
 * - Tenancy on: requires BOTH an authenticated principal AND an active
 *   OrganizationMember row for the request's organization. A valid session
 * from tenant A is worthless against tenant B — different databases hold
 *   the commerce data and this gate holds the roster.
 *
 * Apply AFTER AuthGuard/RolesGuard on tenant-admin controllers. Riders and
 * customers are bound separately: riders via the tenant-local approved
 * personnel record, customers via tenant-local account rows.
 */
@Injectable()
export class TenantMembershipService {
  private readonly cache = new Map<
    string,
    { value: MemberRow | null; expiresAt: number }
  >();
  private readonly CACHE_TTL_MS = 60_000;

  private readonly CHANNEL = 'tenancy:membership:invalidate';

  constructor(
    private readonly platformClient: Pick<PrismaClient, 'organizationMember'>,
    /**
     * MT-13 multi-instance correctness: when present, invalidations are
     * published to Redis and every backend instance subscribed here clears
     * its local slice immediately — a deactivated staffer cannot ride
     * another node's 60s cache tail.
     */
    private readonly redis?: Pick<RedisService, 'getClient'>,
  ) {}

  /**
   * Wire cross-instance invalidation. Called by the tenancy module at
   * bootstrap; failures degrade to per-process caching only.
   */
  async initCrossInstanceInvalidation(): Promise<void> {
    if (!this.redis) return;
    try {
      const client = await this.redis.getClient();
      if (!client) return;
      const subscriber: Redis = client.duplicate();
      subscriber.on('message', (_channel: string, payload: string) => {
        try {
          const parsed: unknown = JSON.parse(payload);
          if (!isMembershipInvalidation(parsed)) {
            this.clearLocal();
            return;
          }
          this.clearLocal(parsed.organizationId, parsed.email);
        } catch {
          this.clearLocal();
        }
      });
      await subscriber.subscribe(this.CHANNEL);
    } catch {
      // Cache stays local-only; TTL bounds staleness regardless.
    }
  }

  /** Active roster lookup with a short per-process cache (roster is cold data). */
  async findActive(
    organizationId: string,
    email: string,
  ): Promise<TenantMembershipInfo | null> {
    const key = `${organizationId}:${email.toLowerCase()}`;
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value
        ? { membershipId: cached.value.id, role: cached.value.role }
        : null;
    }

    const row = await this.platformClient.organizationMember.findFirst({
      where: {
        organizationId,
        email: email.toLowerCase(),
        isActive: true,
      },
      select: { id: true, email: true, isActive: true, role: true },
    });

    this.cache.set(key, {
      value: row,
      expiresAt: Date.now() + this.CACHE_TTL_MS,
    });
    return row ? { membershipId: row.id, role: row.role } : null;
  }

  /** Roster changes take effect immediately for the affected identity —
   * locally AND on every peer instance via the Redis channel. */
  invalidate(organizationId?: string, email?: string): void {
    this.clearLocal(organizationId, email);
    const redis = this.redis;
    if (!redis) return;
    void (async () => {
      try {
        const client = await redis.getClient();
        if (!client) return;
        await client.publish(
          this.CHANNEL,
          JSON.stringify({ organizationId, email }),
        );
      } catch {
        // Local clear already applied; peers expire via TTL.
      }
    })();
  }

  private clearLocal(organizationId?: string, email?: string): void {
    if (organizationId && email) {
      this.cache.delete(`${organizationId}:${email.toLowerCase()}`);
    } else if (!organizationId && !email) {
      this.cache.clear();
    }
  }
}

@Injectable()
export class TenantMembershipGuard implements CanActivate {
  constructor(private readonly memberships: TenantMembershipService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if ((process.env.TENANCY_ENABLED || 'false') !== 'true') {
      return true;
    }
    const request = context
      .switchToHttp()
      .getRequest<TenantMembershipRequest>();
    const { organizationId } = getTenantContext();

    const principal = request.user ?? request.platformPrincipal;
    const email = String(principal?.email ?? '')
      .trim()
      .toLowerCase();
    if (!email) {
      throw new ForbiddenException('TENANT_MEMBERSHIP_REQUIRED');
    }

    const membership = await this.memberships.findActive(organizationId, email);
    if (!membership) {
      throw new ForbiddenException('TENANT_MEMBERSHIP_REQUIRED');
    }
    request.tenantMembership = membership;
    return true;
  }
}
