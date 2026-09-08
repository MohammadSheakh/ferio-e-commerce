import { NotFoundException } from '@nestjs/common';
import { TenantCallbackRunner } from '../services/tenant-callback.runner';

function registry(status: 'ACTIVE' | 'CLOSED') {
  return {
    id: 'tdb-a',
    organizationId: 'org-a',
    status: 'READY' as const,
    host: 'localhost',
    port: 5432,
    databaseName: 'tenant_a',
    username: 'tenant',
    credentialCipher: 'encrypted',
    organization: { status },
  };
}

describe('TenantCallbackRunner lifecycle boundary', () => {
  it('does not run callbacks for a closed organization', async () => {
    const findUnique = jest.fn().mockResolvedValue(registry('CLOSED'));
    const getClient = jest.fn();
    const runner = new TenantCallbackRunner(
      { client: { tenantDatabase: { findUnique } } } as never,
      { getClient } as never,
    );

    await expect(runner.runForOrganization('org-a', jest.fn())).rejects.toThrow(
      new NotFoundException('TENANT_DATABASE_NOT_READY'),
    );
    expect(getClient).not.toHaveBeenCalled();
    expect(findUnique).toHaveBeenCalledWith({
      where: { organizationId: 'org-a' },
      include: { organization: { select: { status: true } } },
    });
  });

  it('runs callbacks for a ready active organization', async () => {
    const findUnique = jest.fn().mockResolvedValue(registry('ACTIVE'));
    const callback = jest.fn().mockResolvedValue('processed');
    const runner = new TenantCallbackRunner(
      { client: { tenantDatabase: { findUnique } } } as never,
      { getClient: jest.fn().mockResolvedValue({}) } as never,
    );

    await expect(runner.runForOrganization('org-a', callback)).resolves.toBe(
      'processed',
    );
    expect(callback).toHaveBeenCalledTimes(1);
  });
});
