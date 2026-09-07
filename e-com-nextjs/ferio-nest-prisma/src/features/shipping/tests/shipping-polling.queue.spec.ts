import type { ConfigService } from '@nestjs/config';
import type { Queue } from 'bullmq';
import { runWithTenantContext } from '../../../tenancy/context/tenant-context';
import type { AuditService } from '../../audit/services/audit.service';
import {
  COURIER_POLL_JOB,
  type CourierPollJobData,
  ShippingPollingQueue,
} from '../queues/shipping-polling.queue';
import type { ShippingPollingService } from '../services/shipping-polling.service';

describe('ShippingPollingQueue', () => {
  const originalTenancy = process.env.TENANCY_ENABLED;
  const queue = { add: jest.fn() };
  const config = { get: jest.fn() };
  const polling = {
    prepareAttempt: jest.fn(),
    attachQueueJob: jest.fn(),
  };
  const audit = { record: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    queue.add.mockResolvedValue({ id: 'queue-job-1' });
    polling.prepareAttempt.mockResolvedValue({ id: 'poll-attempt-1' });
    polling.attachQueueJob.mockResolvedValue(undefined);
    audit.record.mockResolvedValue(undefined);
  });

  afterAll(() => {
    if (originalTenancy === undefined) delete process.env.TENANCY_ENABLED;
    else process.env.TENANCY_ENABLED = originalTenancy;
  });

  it('stamps manual polling jobs with the resolved tenant', async () => {
    process.env.TENANCY_ENABLED = 'true';
    const service = new ShippingPollingQueue(
      queue as unknown as Queue<CourierPollJobData>,
      config as unknown as ConfigService,
      polling as unknown as ShippingPollingService,
      audit as unknown as AuditService,
    );
    const actor = {
      userId: 'admin-1',
      role: 'admin',
      email: 'admin@ferio.local',
    } as const;

    await runWithTenantContext(
      {
        organizationId: 'org-a',
        tenantDatabaseId: 'tdb-a',
        database: {
          id: 'tdb-a',
          host: 'db.internal',
          port: 5432,
          databaseName: 'tenant_a',
          username: 'tenant_a',
          credentialCipher: 'ciphertext',
        },
        domainId: 'domain-a',
        hostname: 'a.ferio.local',
        subscriptionStatus: 'ACTIVE',
      },
      async () => {
        await service.enqueueShipment('shipment-1', actor);
      },
    );

    expect(queue.add).toHaveBeenCalledWith(
      COURIER_POLL_JOB,
      { pollAttemptId: 'poll-attempt-1', organizationId: 'org-a' },
      { jobId: 't:org-a:courier-poll-poll-attempt-1' },
    );
  });

  it('fails closed when manual polling lacks tenant context', async () => {
    process.env.TENANCY_ENABLED = 'true';
    const service = new ShippingPollingQueue(
      queue as unknown as Queue<CourierPollJobData>,
      config as unknown as ConfigService,
      polling as unknown as ShippingPollingService,
      audit as unknown as AuditService,
    );

    await expect(
      service.enqueueShipment('shipment-1', {
        userId: 'admin-1',
        role: 'admin',
        email: 'admin@ferio.local',
      }),
    ).rejects.toThrow('TENANT_CONTEXT_REQUIRED_FOR_COURIER_POLL');
    expect(queue.add).not.toHaveBeenCalled();
  });
});
