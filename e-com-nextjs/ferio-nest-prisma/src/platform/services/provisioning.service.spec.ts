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
        tenantDomain: { findFirst: jest.fn().mockResolvedValue(null) },
        tenantDatabase: { findUnique: jest.fn().mockResolvedValue(null) },
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
      organizations,
      domains,
      dbProvisioner,
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

  it('does not recreate the domain or tenant database during a replay', async () => {
    const built = build();
    const executeStep = (
      built.service as unknown as {
        executeStep: (
          run: {
            id: string;
            organizationId: string;
            organization: { slug: string; name: string };
          },
          stepName: string,
          stepRowId: string,
        ) => Promise<void>;
      }
    ).executeStep.bind(built.service);
    const domain = { hostname: 'acme.ferio.local' };
    built.platform.client.tenantDomain.findFirst.mockResolvedValue(domain);
    built.platform.client.tenantDatabase.findUnique.mockResolvedValue({
      databaseName: 'ferio_tenant_acme',
    });
    const stepUpdate = jest.fn().mockResolvedValue({});
    built.platform.client.provisioningStep = { update: stepUpdate };

    const run = {
      id: 'run-1',
      organizationId: 'org-a',
      organization: { slug: 'acme', name: 'Acme' },
    };
    await executeStep(run, 'RESERVE_SUBDOMAIN', 'step-domain');
    await executeStep(run, 'REGISTER_TENANT_DATABASE', 'step-database');

    expect(built.domains.reserveSubdomain).not.toHaveBeenCalled();
    expect(built.dbProvisioner.createTenantDatabase).not.toHaveBeenCalled();
    expect(stepUpdate).toHaveBeenCalled();
  });

  it('does not transition an organization that is already active during replay', async () => {
    const built = build();
    built.platform.client.organization.findUnique.mockResolvedValue({
      status: 'ACTIVE',
    });
    built.platform.client.provisioningStep = {
      update: jest.fn().mockResolvedValue({}),
    };

    const executeStep = (
      built.service as unknown as {
        executeStep: (
          run: {
            id: string;
            organizationId: string;
            organization: { slug: string; name: string };
          },
          stepName: string,
          stepRowId: string,
        ) => Promise<void>;
      }
    ).executeStep.bind(built.service);
    await executeStep(
      {
        id: 'run-1',
        organizationId: 'org-a',
        organization: { slug: 'acme', name: 'Acme' },
      },
      'ACTIVATE_ORGANIZATION',
      'step-activate',
    );

    expect(built.organizations.transition).not.toHaveBeenCalled();
  });
});
