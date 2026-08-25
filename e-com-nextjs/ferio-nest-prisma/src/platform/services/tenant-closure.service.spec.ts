import { ConflictException } from '@nestjs/common';
import { TenantClosureService } from './tenant-closure.service';

describe('TenantClosureService (PO-013)', () => {
  const DAY = 24 * 60 * 60 * 1000;

  function build(closureStartedDaysAgo: number | null) {
    const organization = {
      id: 'org-1',
      status: 'CLOSURE_PENDING',
      domains: [{ id: 'dom-1', status: 'ACTIVE' }],
      databases: [
        { id: 'tdb-1', status: 'READY' },
        { id: 'tdb-2', status: 'RETIRED' },
      ],
      lifecycleEvents:
        closureStartedDaysAgo === null
          ? []
          : [
              {
                toStatus: 'CLOSURE_PENDING' as const,
                createdAt: new Date(Date.now() - closureStartedDaysAgo * DAY),
              },
            ],
    };
    const platform = { client: { organization: { findUnique: jest.fn().mockResolvedValue(organization), update: jest.fn().mockResolvedValue({}) }, tenantDatabase: { update: jest.fn().mockResolvedValue({}) }, platformAuditLog: { create: jest.fn() } } };
    const organizations = { transition: jest.fn().mockResolvedValue({}) };
    const domains = { disable: jest.fn().mockResolvedValue({}) };
    const databases = { publicView: jest.fn() };
    const audit = { record: jest.fn().mockResolvedValue({}) };
    const service = new TenantClosureService(
      platform as never,
      organizations as never,
      domains as never,
      databases as never,
      audit as never,
    );
    return { service, platform, organizations, domains, databases, audit };
  }

  it('initiating closure transitions to CLOSURE_PENDING and disables every domain', async () => {
    const built = build(null);
    (built.platform.client.organization.findUnique as jest.Mock).mockResolvedValueOnce({
      id: 'org-1',
      status: 'ACTIVE',
      domains: [
        { id: 'dom-a', status: 'ACTIVE' },
        { id: 'dom-b', status: 'DISABLED' },
      ],
    });

    await built.service.initiateClosure('org-1', { actorId: 'po', reason: 'owner request' });

    expect(built.organizations.transition).toHaveBeenCalledWith(
      'org-1',
      'CLOSURE_PENDING',
      expect.objectContaining({ reason: 'owner request' }),
    );
    // Only the ACTIVE domain gets disabled; already-disabled untouched.
    expect(built.domains.disable).toHaveBeenCalledTimes(1);
    expect(built.audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'TENANT_CLOSURE_INITIATED' }),
    );
  });

  it('refuses finalization inside the 90-day recoverable window without override', async () => {
    const built = build(10); // closed 10 days ago
    await expect(
      built.service.finalizeClosure('org-1', { retentionAcknowledged: true }),
    ).rejects.toMatchObject({
      message: expect.stringContaining('CLOSURE_RETENTION_PERIOD_ACTIVE'),
    });
    expect(built.platform.client.tenantDatabase.update).not.toHaveBeenCalled();
  });

  it('allows finalization after the 90-day window, retiring registries only once', async () => {
    const built = build(91);
    await built.service.finalizeClosure('org-1', { retentionAcknowledged: true });

    // tdb-1 retires; tdb-2 was already retired and is skipped.
    expect(built.platform.client.tenantDatabase.update).toHaveBeenCalledTimes(1);
    expect(built.organizations.transition).toHaveBeenCalledWith(
      'org-1',
      'CLOSED',
      expect.objectContaining({ actorId: undefined }),
    );
  });

  it('permits an explicit operator override inside the window (audited path)', async () => {
    const built = build(5);
    await expect(
      built.service.finalizeClosure('org-1', {
        retentionAcknowledged: true,
        overrideRetentionPeriod: true,
      }),
    ).resolves.toBeUndefined();
    expect(built.organizations.transition).toHaveBeenCalledWith(
      'org-1',
      'CLOSED',
      expect.anything(),
    );
  });
});
