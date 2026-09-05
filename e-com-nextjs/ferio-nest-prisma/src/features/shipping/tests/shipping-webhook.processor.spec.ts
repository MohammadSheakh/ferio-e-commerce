import { ShippingWebhookProcessor } from '../processors/shipping-webhook.processor';
import {
  COURIER_CALLBACK_RETRY_JOB,
  COURIER_CALLBACK_SWEEP_JOB,
} from '../queues/shipping-webhook.queue';

describe('ShippingWebhookProcessor', () => {
  const shipping = { retryWebhookLog: jest.fn() };
  const callbackQueue = { enqueueRecoverable: jest.fn() };
  const processor = new ShippingWebhookProcessor(
    shipping as never,
    callbackQueue as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('routes sweep jobs to recoverable callback discovery', async () => {
    callbackQueue.enqueueRecoverable.mockResolvedValue({ queuedCount: 2 });

    await expect(
      processor.process({
        id: 'sweep-1',
        name: COURIER_CALLBACK_SWEEP_JOB,
        data: {},
      } as never),
    ).resolves.toEqual({ queuedCount: 2 });
  });

  it('routes retry jobs to retained callback processing', async () => {
    shipping.retryWebhookLog.mockResolvedValue({ accepted: true });

    await expect(
      processor.process({
        id: 'retry-1',
        name: COURIER_CALLBACK_RETRY_JOB,
        data: { callbackLogId: 'log-1' },
      } as never),
    ).resolves.toEqual({ accepted: true });
    expect(shipping.retryWebhookLog).toHaveBeenCalledWith('log-1');
  });
});
