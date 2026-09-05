import { TransactionalMessageDispatcher } from '../services/transactional-message-dispatcher';

describe('TransactionalMessageDispatcher', () => {
  const message = {
    id: 'message-1',
    deduplicationKey: 'ORDER_CONFIRMED:order:1',
    recipient: '+8801712345678',
    templateKey: 'order-confirmed',
    templateVersion: 3,
    renderedSubject: 'Order FER-1 confirmed',
    renderedBody: 'Order FER-1 is confirmed.',
    payload: { orderReference: 'FER-1' },
    channelPlan: [],
    fallbackReason: null,
    attempts: [],
  };

  function setup(results: Array<Record<string, unknown>>) {
    const update = jest.fn(async ({ data }) => ({ id: message.id, ...data }));
    const prisma = {
      commerceMessage: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest.fn().mockResolvedValue(message),
        update,
      },
      commerceMessagingPolicy: {
        findUnique: jest.fn().mockResolvedValue({
          enabled: true,
          version: 4,
          channelPriority: ['WHATSAPP', 'SMS'],
          fallbackOnDefinitiveFailure: true,
        }),
      },
      commerceMessageAttempt: {
        create: jest.fn(async ({ data }) => ({
          id: `attempt-${data.attemptNumber}`,
          ...data,
        })),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    const adapters = {
      readiness: jest.fn().mockReturnValue([
        { channel: 'WHATSAPP', provider: 'fake-whatsapp', configured: true },
        { channel: 'SMS', provider: 'fake-sms', configured: true },
      ]),
      dispatch: jest.fn().mockImplementation(async () => results.shift()),
    };
    return {
      dispatcher: new TransactionalMessageDispatcher(
        prisma as never,
        adapters as never,
      ),
      prisma,
      adapters,
      update,
    };
  }

  it('falls back only after a definitive provider failure', async () => {
    const { dispatcher, adapters, update } = setup([
      { status: 'FAILED', errorCode: 'REJECTED' },
      { status: 'ACCEPTED', providerMessageId: 'sms-1' },
    ]);

    await dispatcher.execute(message.id);

    expect(adapters.dispatch).toHaveBeenCalledTimes(2);
    expect(adapters.dispatch).toHaveBeenLastCalledWith(
      'SMS',
      expect.objectContaining({
        templateVersion: 3,
        subject: 'Order FER-1 confirmed',
        body: 'Order FER-1 is confirmed.',
      }),
    );
    expect(update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          selectedChannel: 'SMS',
          status: 'SENT',
        }),
      }),
    );
  });

  it('stops fallback when the first provider outcome is unknown', async () => {
    const { dispatcher, adapters, update } = setup([
      { status: 'UNKNOWN', errorCode: 'TIMEOUT' },
      { status: 'ACCEPTED' },
    ]);

    await dispatcher.execute(message.id);

    expect(adapters.dispatch).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'BLOCKED',
          terminalReason: expect.stringContaining('avoid duplicate delivery'),
        }),
      }),
    );
  });

  it('uses the resolved tenant database in strict mode', async () => {
    const previous = process.env.TENANCY_ENABLED;
    process.env.TENANCY_ENABLED = 'true';
    const { dispatcher, prisma } = setup([{ status: 'ACCEPTED' }]);
    const tenantDb = { getOrLegacy: jest.fn().mockResolvedValue(prisma) };
    (dispatcher as unknown as { tenantDb: typeof tenantDb }).tenantDb = tenantDb;

    try {
      await dispatcher.execute(message.id);
      expect(tenantDb.getOrLegacy).toHaveBeenCalledTimes(1);
    } finally {
      if (previous === undefined) delete process.env.TENANCY_ENABLED;
      else process.env.TENANCY_ENABLED = previous;
    }
  });

  it('fails closed when strict mode has no tenant context', async () => {
    const previous = process.env.TENANCY_ENABLED;
    process.env.TENANCY_ENABLED = 'true';
    const { dispatcher } = setup([]);
    const tenantDb = {
      getOrLegacy: jest.fn().mockRejectedValue(
        new Error('TRANSACTIONAL_MESSAGE_TENANT_CONTEXT_REQUIRED'),
      ),
    };
    (dispatcher as unknown as { tenantDb: typeof tenantDb }).tenantDb = tenantDb;

    try {
      await expect(dispatcher.execute(message.id)).rejects.toThrow(
        'TRANSACTIONAL_MESSAGE_TENANT_CONTEXT_REQUIRED',
      );
    } finally {
      if (previous === undefined) delete process.env.TENANCY_ENABLED;
      else process.env.TENANCY_ENABLED = previous;
    }
  });
});
