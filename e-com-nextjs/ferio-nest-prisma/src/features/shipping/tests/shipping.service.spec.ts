import type { ConfigService } from '@nestjs/config';
import type { PrismaService } from '@app/database';
import type { UserPayload } from '@app/common';
import type { PathaoAdapter } from '../adapters/pathao.adapter';
import type { SteadfastAdapter } from '../adapters/steadfast.adapter';
import type { RedxAdapter } from '../adapters/redx.adapter';
import type { EcourierAdapter } from '../adapters/ecourier.adapter';
import type { PaperflyAdapter } from '../adapters/paperfly.adapter';
import type { CarrybeeAdapter } from '../adapters/carrybee.adapter';
import type { CourierRouterService } from '../services/courier-router.service';
import type { TransactionalMessagingService } from '../../transactional-messaging/services/transactional-messaging.service';
import type { AuditService } from '../../audit/services/audit.service';
import type { PlanGateService } from '../../../platform/services/plan-gate.service';
import { ShippingService } from '../services/shipping.service';

describe('ShippingService provider credential revocation', () => {
  const transaction = {
    courierProviderConfig: {
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    shipmentProvider: { updateMany: jest.fn() },
  };
  const prisma = {
    $transaction: jest.fn((callback: (tx: typeof transaction) => unknown) =>
      Promise.resolve(callback(transaction)),
    ),
  };
  const audit = { record: jest.fn().mockResolvedValue({ id: 'audit-1' }) };
  const actor: UserPayload = {
    userId: 'admin-1',
    email: 'admin@example.test',
    role: 'admin',
  };
  const service = new ShippingService(
    prisma as unknown as PrismaService,
    {} as PathaoAdapter,
    {} as SteadfastAdapter,
    {} as RedxAdapter,
    {} as EcourierAdapter,
    {} as PaperflyAdapter,
    {} as CarrybeeAdapter,
    {} as CourierRouterService,
    {} as TransactionalMessagingService,
    audit as unknown as AuditService,
    {} as ConfigService,
    {} as PlanGateService,
  );

  beforeEach(() => jest.clearAllMocks());

  it('deletes credentials, disables the provider, and audits without secrets', async () => {
    transaction.courierProviderConfig.findUnique.mockResolvedValueOnce({
      id: 'config-1',
      provider: 'PATHAO',
      enabled: true,
    });

    await expect(service.revokeProviderConfig('PATHAO', actor)).resolves.toEqual({
      provider: 'PATHAO',
      revoked: true,
    });
    expect(transaction.courierProviderConfig.delete).toHaveBeenCalledWith({
      where: { provider: 'PATHAO' },
    });
    expect(transaction.shipmentProvider.updateMany).toHaveBeenCalledWith({
      where: { code: 'PATHAO' },
      data: { isActive: false },
    });
    expect(JSON.stringify(audit.record.mock.calls.at(-1))).not.toContain(
      'credentialCipher',
    );
  });

  it('is idempotent when no credential configuration exists', async () => {
    transaction.courierProviderConfig.findUnique.mockResolvedValueOnce(null);

    await expect(service.revokeProviderConfig('PATHAO', actor)).resolves.toEqual({
      provider: 'PATHAO',
      revoked: false,
    });
    expect(transaction.courierProviderConfig.delete).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });
});
