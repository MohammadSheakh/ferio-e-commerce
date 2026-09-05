import { ShippingPollingProcessor } from '../processors/shipping-polling.processor';
import {
  COURIER_POLL_JOB,
  COURIER_POLL_SWEEP_JOB,
} from '../queues/shipping-polling.queue';

describe('ShippingPollingProcessor', () => {
  const polling = { execute: jest.fn() };
  const pollingQueue = { enqueueDue: jest.fn() };
  const processor = new ShippingPollingProcessor(
    polling as never,
    pollingQueue as never,
  );

  beforeEach(() => jest.clearAllMocks());

  it('routes sweep jobs to eligible shipment discovery', async () => {
    pollingQueue.enqueueDue.mockResolvedValue({ queuedCount: 2 });
    await expect(
      processor.process({
        id: 'poll-sweep-1',
        name: COURIER_POLL_SWEEP_JOB,
        data: {},
      } as never),
    ).resolves.toEqual({ queuedCount: 2 });
  });

  it('routes polling jobs to durable attempts', async () => {
    polling.execute.mockResolvedValue({ id: 'attempt-1', status: 'SUCCEEDED' });
    await expect(
      processor.process({
        id: 'poll-job-1',
        name: COURIER_POLL_JOB,
        data: { pollAttemptId: 'attempt-1' },
      } as never),
    ).resolves.toEqual({ id: 'attempt-1', status: 'SUCCEEDED' });
    expect(polling.execute).toHaveBeenCalledWith('attempt-1');
  });
});
