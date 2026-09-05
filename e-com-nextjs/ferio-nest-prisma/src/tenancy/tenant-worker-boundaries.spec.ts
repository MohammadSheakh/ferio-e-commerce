import { PaymentRecoveryProcessor } from '../features/commerce-payments/processors/payment-recovery.processor';
import {
  PAYMENT_EXPIRY_JOB,
  type PaymentRecoveryJobData,
} from '../features/commerce-payments/queues/payment-recovery.queue';
import { ReconciliationProcessor } from '../features/reconciliation/processors/reconciliation.processor';
import {
  RECONCILIATION_SCAN_JOB,
  type ReconciliationJobData,
} from '../features/reconciliation/queues/reconciliation.queue';
import { TransactionalMessageProcessor } from '../features/transactional-messaging/processors/transactional-message.processor';
import {
  TRANSACTIONAL_MESSAGE_JOB,
  type TransactionalMessageJobData,
} from '../features/transactional-messaging/queues/transactional-message.queue';
import type { Job } from 'bullmq';

describe('tenant-aware queue worker boundaries', () => {
  const originalTenancy = process.env.TENANCY_ENABLED;

  afterEach(() => {
    jest.clearAllMocks();
    if (originalTenancy === undefined) delete process.env.TENANCY_ENABLED;
    else process.env.TENANCY_ENABLED = originalTenancy;
  });

  it('rejects payment recovery without organization context in tenant mode', async () => {
    process.env.TENANCY_ENABLED = 'true';
    const payments = { expireAttempt: jest.fn() };
    const recovery = { enqueueDue: jest.fn() };
    const processor = new PaymentRecoveryProcessor(
      payments as never,
      recovery as never,
      { forOrganization: jest.fn() } as never,
    );

    expect(() => processor.process({
        name: PAYMENT_EXPIRY_JOB,
        data: { attemptId: 'attempt-1' },
        id: 'job-1',
      } as unknown as Job<PaymentRecoveryJobData>)).toThrow(
      'TENANT_CONTEXT_REQUIRED_FOR_PAYMENT_RECOVERY',
    );
    expect(payments.expireAttempt).not.toHaveBeenCalled();
  });

  it('executes payment recovery inside the stamped tenant fanout', async () => {
    process.env.TENANCY_ENABLED = 'true';
    const payments = { expireAttempt: jest.fn().mockResolvedValue({ expired: true }) };
    const fanout = {
      forOrganization: jest.fn((_organizationId: string, operation: () => Promise<unknown>) => operation()),
    };
    const processor = new PaymentRecoveryProcessor(
      payments as never,
      { enqueueDue: jest.fn() } as never,
      fanout as never,
    );

    await processor.process({
      name: PAYMENT_EXPIRY_JOB,
      data: { attemptId: 'attempt-1', organizationId: 'org-a' },
      id: 'job-1',
    } as unknown as Job<PaymentRecoveryJobData>);

    expect(fanout.forOrganization).toHaveBeenCalledWith('org-a', expect.any(Function));
    expect(payments.expireAttempt).toHaveBeenCalledWith('attempt-1');
  });

  it('rejects transactional dispatch without organization context in tenant mode', async () => {
    process.env.TENANCY_ENABLED = 'true';
    const dispatcher = { execute: jest.fn() };
    const processor = new TransactionalMessageProcessor(
      dispatcher as never,
      { enqueueDue: jest.fn() } as never,
      { forOrganization: jest.fn() } as never,
    );

    expect(() => processor.process({
        name: TRANSACTIONAL_MESSAGE_JOB,
        data: { messageId: 'message-1' },
        id: 'job-1',
      } as unknown as Job<TransactionalMessageJobData>)).toThrow(
      'TRANSACTIONAL_MESSAGE_ORGANIZATION_REQUIRED',
    );
    expect(dispatcher.execute).not.toHaveBeenCalled();
  });

  it('executes transactional dispatch inside the stamped tenant fanout', async () => {
    process.env.TENANCY_ENABLED = 'true';
    const dispatcher = { execute: jest.fn().mockResolvedValue({ sent: true }) };
    const fanout = {
      forOrganization: jest.fn((_organizationId: string, operation: () => Promise<unknown>) => operation()),
    };
    const processor = new TransactionalMessageProcessor(
      dispatcher as never,
      { enqueueDue: jest.fn() } as never,
      fanout as never,
    );

    await processor.process({
      name: TRANSACTIONAL_MESSAGE_JOB,
      data: { messageId: 'message-1', organizationId: 'org-a' },
      id: 'job-1',
    } as unknown as Job<TransactionalMessageJobData>);

    expect(fanout.forOrganization).toHaveBeenCalledWith('org-a', expect.any(Function));
    expect(dispatcher.execute).toHaveBeenCalledWith('message-1');
  });

  it('fails reconciliation retry when tenant fanout is unavailable', async () => {
    process.env.TENANCY_ENABLED = 'true';
    const reconciliation = { retryRun: jest.fn() };
    const processor = new ReconciliationProcessor(reconciliation as never);

    await expect(
      processor.process({
        name: RECONCILIATION_SCAN_JOB,
        data: {
          overdueHours: 24,
          retryRunId: 'run-1',
          organizationId: 'org-a',
        },
        id: 'job-1',
      } as unknown as Job<ReconciliationJobData>),
    ).rejects.toThrow('TENANT_FANOUT_UNAVAILABLE');
    expect(reconciliation.retryRun).not.toHaveBeenCalled();
  });
});
