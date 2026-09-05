import type { Response } from 'express';
import { CommercePaymentProvider } from '@prisma/client';
import { buildCallbackToken } from '../../../tenancy/callback-tenant.util';
import { PublicCommercePaymentsController } from '../commerce-payments.controller';

describe('PublicCommercePaymentsController tenant returns', () => {
  const payments = {
    processCallback: jest.fn(),
    returnContext: jest.fn(),
  };
  const callbackRunner = {
    runForOrganization: jest.fn(
      async (_organizationId: string, operation: () => Promise<unknown>) =>
        operation(),
    ),
  };
  const returnOrigins = { forOrganization: jest.fn() };
  const response = {
    status: jest.fn(),
    json: jest.fn(),
    redirect: jest.fn(),
  };
  const secret = 'payment-callback-test-secret-12345';
  const controller = new PublicCommercePaymentsController(
    payments as never,
    callbackRunner as never,
    returnOrigins as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.TENANCY_ENABLED = 'true';
    process.env.PLATFORM_CALLBACK_SECRET = secret;
    response.status.mockReturnValue(response);
    payments.processCallback.mockResolvedValue({
      paid: true,
      orderId: 'order-1',
      status: 'SUCCEEDED',
    });
    payments.returnContext.mockResolvedValue({
      reference: 'FER-1001',
      status: 'CONFIRMED',
    });
    returnOrigins.forOrganization.mockResolvedValue('https://shop.example.com');
  });

  it('redirects a signed tenant callback to that tenant active domain', async () => {
    await controller.callback(
      CommercePaymentProvider.SSLCOMMERZ,
      'success',
      {},
      { cbt: buildCallbackToken('org-a', secret) },
      response as unknown as Response,
    );

    expect(callbackRunner.runForOrganization).toHaveBeenCalledWith(
      'org-a',
      expect.any(Function),
    );
    expect(returnOrigins.forOrganization).toHaveBeenCalledWith('org-a');
    expect(response.redirect).toHaveBeenCalledWith(
      303,
      'https://shop.example.com/order-confirmation?payment=success&reference=FER-1001&status=CONFIRMED',
    );
  });

  it('processes tenant IPNs without resolving a browser return domain', async () => {
    await controller.callback(
      CommercePaymentProvider.SSLCOMMERZ,
      'ipn',
      {},
      { cbt: buildCallbackToken('org-a', secret) },
      response as unknown as Response,
    );

    expect(returnOrigins.forOrganization).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ paid: true, orderId: 'order-1' }),
    );
    expect(response.redirect).not.toHaveBeenCalled();
  });
});
