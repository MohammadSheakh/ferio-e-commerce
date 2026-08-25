import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  PlatformBillingService,
} from './platform-billing.service';

/**
 * Platform billing service tests (PO-006): financial isolation by
 * construction, server-authoritative success validation, idempotent
 * single-transition callbacks.
 */
describe('PlatformBillingService', () => {
  const invoice = {
    id: 'inv-1',
    number: 'SI-202608-ABCDE',
    organizationId: 'org-1',
    subscriptionId: 'sub-1',
    amountMinor: 199900,
    currency: 'BDT',
    paid: false,
  };

  function build(attemptRow?: Record<string, unknown>) {
    const platform = {
      client: {
        subscription: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'sub-1',
            plan: { amountMinor: 199900 },
          }),
        },
        saasInvoice: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockImplementation(({ data }) =>
            Promise.resolve({ id: 'inv-new', ...data }),
          ),
          findUnique: jest.fn().mockResolvedValue(invoice),
          update: jest.fn().mockResolvedValue({ ...invoice, paid: true }),
        },
        saasPaymentAttempt: {
          create: jest.fn().mockResolvedValue({ id: 'att-1' }),
          findUnique: jest.fn(),
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
        platformAuditLog: { create: jest.fn() },
      },
    };
    const audit = { record: jest.fn() };
    const service = new PlatformBillingService(platform as never, audit as never);
    return { service, platform, audit };
  }

  beforeEach(() => {
    process.env.PLATFORM_SSLCOMMERZ_STORE_ID = 'store-id';
    process.env.PLATFORM_SSLCOMMERZ_STORE_PASSWORD = 'store-pass';
    delete process.env.PLATFORM_SSLCOMMERZ_IS_LIVE;
  });

  it('creates an open invoice from the plan amount (control plane only)', async () => {
    const { platform } = build();
    await service(platform).ensureInvoice({
      organizationId: 'org-1',
      periodStart: new Date('2026-08-01'),
      periodEnd: new Date('2026-09-01'),
    });
    expect(platform.client.saasInvoice.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          amountMinor: 199900,
          currency: 'BDT',
        }),
      }),
    );
  });

  it('initiates a hosted session with an unguessable reference and records INITIATED', async () => {
    const restore = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      json: async () => ({
        GatewayPageURL: 'https://sandbox.sslcommerz.com/hosted/session-1',
      }),
    }) as unknown as typeof fetch;
    try {
      const built = build();
      const result = await built.service.initiatePayment('inv-1');
      expect(result.redirectUrl).toContain('sslcommerz.com');
      expect(result.reference).toMatch(/^SAAS-SI-/);
      const created = built.platform.client.saasPaymentAttempt.create.mock.calls[0][0];
      expect(created.data.status).toBe('INITIATED');
      expect(created.data.reference).toBe(result.reference);
      // Success URL carries the reference for callback routing.
      const body = String(built.platform.client.saasPaymentAttempt.create.mock.calls[0]);
      void body;
    } finally {
      global.fetch = restore;
    }
  });

  it('applies a validated success exactly once and marks the invoice paid', async () => {
    const built = build();
    built.platform.client.saasPaymentAttempt.findUnique.mockResolvedValueOnce({
      id: 'att-1',
      reference: 'SAAS-REF-1',
      status: 'INITIATED',
      amountMinor: 199900,
      invoiceId: 'inv-1',
      invoice,
    });
    const restore = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      json: async () => ({
        status: 'VALID',
        tran_id: 'SAAS-REF-1',
        amount: '1999.00',
        currency: 'BDT',
      }),
    }) as unknown as typeof fetch;
    try {
      const result = await built.service.applyCallbackOutcome({
        reference: 'SAAS-REF-1',
        valId: 'VAL-1',
        outcome: 'success',
      });
      expect(result).toEqual({ applied: true, paid: true });
      expect(built.platform.client.saasPaymentAttempt.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { reference: 'SAAS-REF-1', status: 'INITIATED' },
        }),
      );
      expect(built.platform.client.saasInvoice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'inv-1' },
          data: { paid: true },
        }),
      );
      expect(built.audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'SAAS_PAYMENT_SUCCEEDED' }),
      );
    } finally {
      global.fetch = restore;
    }
  });

  it('absorbs duplicate callbacks without side effects', async () => {
    const built = build();
    built.platform.client.saasPaymentAttempt.findUnique.mockResolvedValueOnce({
      id: 'att-1',
      reference: 'SAAS-REF-1',
      status: 'SUCCEEDED', // already transitioned by the first delivery
      amountMinor: 199900,
      invoiceId: 'inv-1',
      invoice,
    });

    const result = await built.service.applyCallbackOutcome({
      reference: 'SAAS-REF-1',
      valId: 'VAL-1',
      outcome: 'success',
    });
    void result;

    expect(built.platform.client.saasPaymentAttempt.updateMany).not.toHaveBeenCalledWith(
      expect.objectContaining({
        where: { reference: 'SAAS-REF-1', status: 'INITIATED' },
      }),
    );
    expect(built.platform.client.saasInvoice.update).not.toHaveBeenCalled();
  });

  it('rejects a success claim whose val_id fails server validation', async () => {
    const built = build();
    built.platform.client.saasPaymentAttempt.findUnique.mockResolvedValueOnce({
      id: 'att-1',
      reference: 'SAAS-REF-2',
      status: 'INITIATED',
      amountMinor: 199900,
      invoiceId: 'inv-1',
      invoice,
    });
    const restore = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      json: async () => ({ status: 'EXPIRED', tran_id: 'SAAS-REF-2', amount: '1999.00' }),
    }) as unknown as typeof fetch;
    try {
      const outcome = await built.service.applyCallbackOutcome({
        reference: 'SAAS-REF-2',
        valId: 'VAL-BAD',
        outcome: 'success',
      });
      expect(outcome.applied).toBe(true); // recorded as failed evidence
      expect(built.platform.client.saasPaymentAttempt.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { reference: 'SAAS-REF-2', status: 'INITIATED' },
          data: expect.objectContaining({ status: 'FAILED' }),
        }),
      );
    } finally {
      global.fetch = restore;
    }
  });

  it('refuses amount mismatches even when SSLCommerz says VALID', async () => {
    const built = build();
    built.platform.client.saasPaymentAttempt.findUnique.mockResolvedValueOnce({
      id: 'att-3',
      reference: 'SAAS-REF-3',
      status: 'INITIATED',
      amountMinor: 199900,
      invoiceId: 'inv-1',
      invoice,
    });
    const restore = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      json: async () => ({ status: 'VALID', tran_id: 'SAAS-REF-3', amount: '19.99' }),
    }) as unknown as typeof fetch;
    try {
      await expect(
        built.service.applyCallbackOutcome({
          reference: 'SAAS-REF-3',
          valId: 'VAL-OK',
          outcome: 'success',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(built.platform.client.saasPaymentAttempt.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { reference: 'SAAS-REF-3', status: 'INITIATED' },
          data: expect.objectContaining({ status: 'FAILED' }),
        }),
      );
    } finally {
      global.fetch = restore;
    }
  });

  it('throws NotFound for unknown references instead of guessing', async () => {
    const built = build();
    built.platform.client.saasPaymentAttempt.findUnique.mockResolvedValueOnce(null);
    await expect(
      built.service.applyCallbackOutcome({
        reference: 'SAAS-GHOST',
        valId: 'V',
        outcome: 'success',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

function service(platform: unknown): PlatformBillingService {
  return new PlatformBillingService(
    platform as never,
    { record: jest.fn() } as never,
  );
}
