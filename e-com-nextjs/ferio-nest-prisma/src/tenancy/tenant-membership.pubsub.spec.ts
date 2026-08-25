import { TenantMembershipService } from './tenant-membership.guard';

/** Minimal pub/sub double mimicking ioredis duplicate/publish semantics. */
class FakeRedis {
  private handlers: Array<(channel: string, payload: string) => void> = [];
  published: Array<string> = [];

  async getClient() {
    const self = this;
    return {
      duplicate() {
        return {
          on(_event: 'message', handler: (channel: string, payload: string) => void) {
            self.handlers.push(handler);
          },
          subscribe(_channel: string) {
            return Promise.resolve();
          },
        };
      },
      publish(channel: string, payload: string) {
        self.published.push(`${channel}|${payload}`);
        for (const handler of self.handlers) {
          handler(channel, payload);
        }
        return Promise.resolve(1);
      },
    };
  }
}

function serviceWith(redis?: FakeRedis) {
  const platformClient = {
    organizationMember: { findFirst: jest.fn().mockResolvedValue(null) },
  };
  const service = new TenantMembershipService(platformClient as never, redis as never);
  // Seed a local cache entry directly to observe invalidation.
  const cache = (service as unknown as { cache: Map<string, unknown> }).cache;
  cache.set(
    'org-a:fired@ferio.test',
    { value: { id: 'm1', email: 'fired@ferio.test', isActive: true, role: 'STAFF' }, expiresAt: Date.now() + 60_000 },
  );
  cache.set(
    'org-b:other@ferio.test',
    { value: null, expiresAt: Date.now() + 60_000 },
  );
  return { service, platformClient, cache };
}

describe('TenantMembershipService cross-instance invalidation (MT-13)', () => {
  it('publishes targeted invalidations and clears peers sharing the bus', async () => {
    const bus = new FakeRedis();
    const nodeA = serviceWith(bus).service;
    await nodeA.initCrossInstanceInvalidation();

    const peer = serviceWith(bus);
    const peerService = peer.service;
    await peerService.initCrossInstanceInvalidation();
    expect(peer.cache.has('org-a:fired@ferio.test')).toBe(true);

    // Deactivation happens on node A…
    nodeA.invalidate('org-a', 'fired@ferio.test');
    await new Promise((r) => setTimeout(r, 0));

    // …and node B's cache is cleared immediately, not after its TTL.
    expect(peer.cache.has('org-a:fired@ferio.test')).toBe(false);
    // Untouched identity survives.
    expect(peer.cache.has('org-b:other@ferio.test')).toBe(true);
    expect(bus.published.some((p) => p.includes('tenancy:membership:invalidate'))).toBe(true);
  });

  it('keeps local-only semantics when Redis is absent', async () => {
    const { service, cache } = serviceWith(undefined);
    service.invalidate('org-a', 'fired@ferio.test');
    expect(cache.has('org-a:fired@ferio.test')).toBe(false);
    expect(cache.has('org-b:other@ferio.test')).toBe(true);
  });

  it('clears everything on wildcard invalidation across peers', async () => {
    const bus = new FakeRedis();
    const nodeA = serviceWith(bus).service;
    const peer = serviceWith(bus);
    await nodeA.initCrossInstanceInvalidation();
    await peer.service.initCrossInstanceInvalidation();

    nodeA.invalidate(); // wildcard
    await new Promise((r) => setTimeout(r, 0));

    expect(peer.cache.size).toBe(0);
  });
});
