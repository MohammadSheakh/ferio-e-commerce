import type { ConfigService } from '@nestjs/config';
import { AamarpayGateway } from '../gateways/aamarpay.gateway';
import { SslcommerzGateway } from '../gateways/sslcommerz.gateway';

const input = {
  merchantTransactionId: 'FERPAY123',
  amount: 125000,
  currency: 'BDT',
  orderReference: 'FER-123',
  customer: {
    name: 'Customer',
    email: 'customer@example.com',
    phone: '+8801712345678',
    address: 'Road 1',
    city: 'Dhaka',
  },
  successUrl: 'https://api.example.com/success',
  failUrl: 'https://api.example.com/fail',
  cancelUrl: 'https://api.example.com/cancel',
  ipnUrl: 'https://api.example.com/ipn',
};

function config(values: Record<string, string>) {
  return {
    get: jest.fn((key: string, fallback?: string) => values[key] ?? fallback),
  } as unknown as ConfigService;
}

describe('hosted payment adapters', () => {
  afterEach(() => jest.restoreAllMocks());

  it('initiates SSLCommerz server-side with minor-unit conversion', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        GatewayPageURL: 'https://sandbox.sslcommerz.com/pay',
        sessionkey: 'session-1',
      }),
    } as Response);
    const adapter = new SslcommerzGateway(
      config({
        SSLCOMMERZ_STORE_ID: 'store',
        SSLCOMMERZ_STORE_PASSWORD: 'secret',
      }),
    );
    await expect(adapter.initiate(input)).resolves.toMatchObject({
      redirectUrl: 'https://sandbox.sslcommerz.com/pay',
      providerSessionId: 'session-1',
    });
    const request = (global.fetch as jest.Mock).mock.calls[0][1];
    expect(String(request.body)).toContain('total_amount=1250.00');
    expect(String(request.body)).toContain('tran_id=FERPAY123');
  });

  it('validates SSLCommerz transaction via server-to-server validation API', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'VALID',
        tran_id: 'FERPAY123',
        amount: '1250.00',
        currency_type: 'BDT',
        bank_tran_id: 'SSL-BANK-999',
        risk_level: '0',
      }),
    } as Response);
    const adapter = new SslcommerzGateway(
      config({
        SSL_STORE_ID: 'test-store-id',
        SSL_STORE_PASSWORD: 'test-store-password',
      }),
    );
    expect(adapter.isConfigured()).toBe(true);
    await expect(
      adapter.validate({ val_id: 'VAL-12345', tran_id: 'FERPAY123' }),
    ).resolves.toMatchObject({
      outcome: 'SUCCEEDED',
      merchantTransactionId: 'FERPAY123',
      amount: 125000,
      currency: 'BDT',
      providerTransactionId: 'SSL-BANK-999',
      validationId: 'VAL-12345',
      riskLevel: '0',
    });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(
        '/validator/api/validationserverAPI.php?val_id=VAL-12345',
      ),
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Correlation-ID': expect.any(String),
        }),
      }),
    );
  });

  it('validates aamarPay through transaction search instead of trusting callback fields', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        pay_status: 'Successful',
        request_id: 'FERPAY123',
        amount: '1250.00',
        currency: 'BDT',
        pg_txnid: 'AAM-1',
      }),
    } as Response);
    const adapter = new AamarpayGateway(
      config({
        AAMARPAY_STORE_ID: 'store',
        AAMARPAY_SIGNATURE_KEY: 'signature',
      }),
    );
    await expect(
      adapter.validate({ mer_txnid: 'FERPAY123', amount: '1.00' }),
    ).resolves.toMatchObject({
      outcome: 'SUCCEEDED',
      merchantTransactionId: 'FERPAY123',
      amount: 125000,
      currency: 'BDT',
      providerTransactionId: 'AAM-1',
    });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/trxcheck/request.php?'),
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Correlation-ID': expect.any(String),
        }),
      }),
    );
  });
});
