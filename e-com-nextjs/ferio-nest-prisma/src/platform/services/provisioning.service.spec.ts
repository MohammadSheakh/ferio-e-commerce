import { ConflictException } from '@nestjs/common';
import { ProvisioningService } from './provisioning.service';

type ProvisioningRun = {
  id: string;
  organizationId: string;
  status: string;
  steps: unknown[];
};

describe('ProvisioningService idempotency boundary', () => {
  function build() {
    const organization = {
      id: 'org-a',
      name: 'Acme',
      slug: 'acme',
      status: 'PROVISIONING',
    };
    const completedRun: ProvisioningRun = {
      id: 'run-1',
      organizationId: 'org-a',
      status: 'COMPLETED',
      steps: [],
    };
    const platform = {
      client: {
        organization: { findUnique: jest.fn().mockResolvedValue(organization) },
        provisioningRun: {
          findUnique: jest.fn(),
          create: jest.fn(),
        },
      },
    };
    const organizations = { transition: jest.fn() };
    const domains = { reserveSubdomain: jest.fn() };
    const databases = {
      register: jest.fn(),
      getDecryptedConnection: jest.fn(),
      setSchemaVersion: jest.fn(),
      markReady: jest.fn(),
    };
    const bootstrapper = { bootstrap: jest.fn(), seedBaseline: jest.fn() };
    const audit = { record: jest.fn() };
    const dbProvisioner = { createTenantDatabase: jest.fn() };
    const service = new ProvisioningService(
      platform as never,
      audit as never,
      organizations as never,
      domains as never,
      databases as never,
      bootstrapper as never,
      dbProvisioner,
    );
    return {
      service,
      platform,
      completedRun,
      organization,
    };
  }

  it('returns the raced completed run after a unique-key collision', async () => {
    const built = build();
    const uniqueViolation = Object.assign(new Error('unique'), {
      code: 'P2002',
    });
    built.platform.client.provisioningRun.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(built.completedRun);
    built.platform.client.provisioningRun.create.mockRejectedValueOnce(
      uniqueViolation,
    );

    await expect(
      built.service.start('org-a', { idempotencyKey: 'prov-key-1' }),
    ).resolves.toBe(built.completedRun);
  });

  it('rejects an idempotency key already owned by another organization', async () => {
    const built = build();
    built.platform.client.provisioningRun.findUnique.mockResolvedValueOnce({
      ...built.completedRun,
      organizationId: 'org-b',
    });

    await expect(
      built.service.start('org-a', { idempotencyKey: 'prov-key-1' }),
    ).rejects.toThrow(
      new ConflictException('PROVISIONING_IDEMPOTENCY_KEY_CONFLICT'),
    );
    expect(built.platform.client.provisioningRun.create).not.toHaveBeenCalled();
  });
});
