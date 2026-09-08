import { BadRequestException } from '@nestjs/common';
import { TransactionalMessagingService } from '../services/transactional-messaging.service';

describe('TransactionalMessagingService templates', () => {
  const actor = {
    userId: 'admin-1',
    email: 'admin@ferio.com',
    role: 'admin',
  } as unknown as import('@app/common').UserPayload;

  function setup() {
    const current = {
      key: 'order-placed',
      eventType: 'ORDER_PLACED',
      enabled: true,
      subjectTemplate: 'Order {{reference}} received',
      bodyTemplate: 'Order {{reference}} received.',
      version: 2,
      updatedById: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const update = jest.fn(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({
        ...current,
        ...data,
        version: current.version + 1,
        updatedById: actor.userId,
      }),
    );
    const messageUpsert = jest.fn().mockResolvedValue({ id: 'message-1' });
    const prisma = {
      commerceMessage: { upsert: messageUpsert },
      commerceMessageTemplate: {
        upsert: jest.fn().mockResolvedValue(current),
      },
      $transaction: jest.fn(
        (
          callback: (value: {
            commerceMessageTemplate: { update: typeof update };
          }) => Promise<unknown>,
        ) => callback({ commerceMessageTemplate: { update } }),
      ),
    };
    const audit = { record: jest.fn().mockResolvedValue({}) };
    return {
      service: new TransactionalMessagingService(
        prisma as never,
        audit as never,
        {} as never,
      ),
      update,
      messageUpsert,
      audit,
    };
  }

  it('increments the version and audits a valid template update', async () => {
    const { service, update, audit } = setup();
    const result = await service.updateTemplate(
      'order-placed',
      { bodyTemplate: 'Order {{reference}} totals {{currency}} {{total}}.' },
      actor,
    );

    expect(result.version).toBe(3);
    const updateCall = (update.mock.calls as unknown[][])[0]?.[0] as {
      data: { version: { increment: number } };
    };
    expect(updateCall.data.version).toEqual({ increment: 1 });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'TRANSACTIONAL_MESSAGE_TEMPLATE_UPDATED',
      }),
      expect.anything(),
    );
  });

  it('rejects placeholders not approved for the event', async () => {
    const { service } = setup();
    await expect(
      service.updateTemplate(
        'order-placed',
        { bodyTemplate: 'Hello {{customerPassword}}' },
        actor,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('copies the rendered template version into the durable message', async () => {
    const { service, messageUpsert } = setup();
    await service.enqueueAfterCommit({
      eventType: 'ORDER_PLACED',
      recipient: '+8801712345678',
      referenceType: 'Order',
      referenceId: 'order-1',
      payload: { reference: 'FER-42' },
    });

    const upsertCall = (messageUpsert.mock.calls as unknown[][])[0]?.[0] as {
      create: {
        templateKey: string;
        templateVersion: number;
        renderedSubject: string;
        renderedBody: string;
      };
    };
    expect(upsertCall.create).toMatchObject({
      templateKey: 'order-placed',
      templateVersion: 2,
      renderedSubject: 'Order FER-42 received',
      renderedBody: 'Order FER-42 received.',
    });
  });
});
