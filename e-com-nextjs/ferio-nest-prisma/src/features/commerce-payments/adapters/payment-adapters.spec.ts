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

function providerResponse(body: Record<string, unknown>): Response {
  return {
    ok: true,
    json: () => Promise.resolve(body),
  } as Response;
}

describe('hosted payment adapters', () => {
  afterEach(() => jest.restoreAllMocks());

  it('initiates SSLCommerz server-side with minor-unit conversion', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      providerResponse({
        GatewayPageURL: 'https://sandbox.sslcommerz.com/pay',
        sessionkey: 'session-1',
      }),
    );
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
    const fetchMock = global.fetch as unknown as jest.MockedFunction<typeof fetch>;
    const request = fetchMock.mock.calls[0]?.[1];
    const body = request?.body;
    const requestBody =
      typeof body === 'string'
        ? body
        : body instanceof URLSearchParams
          ? body.toString()
          : '';
    expect(requestBody).toContain('total_amount=1250.00');
    expect(requestBody).toContain('tran_id=FERPAY123');
  });

  it('validates SSLCommerz transaction via server-to-server validation API', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      providerResponse({
        status: 'VALID',
        tran_id: 'FERPAY123',
        amount: '1250.00',
        currency_type: 'BDT',
        bank_tran_id: 'SSL-BANK-999',
        risk_level: '0',
      }),
    );
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
    const validationRequest = (global.fetch as unknown as jest.MockedFunction<typeof fetch>)
      .mock.calls[0]?.[1];
    expect(validationRequest).toBeDefined();
    const headers = new Headers(validationRequest?.headers);
    expect(headers.get('X-Correlation-ID')).toEqual(expect.any(String));
  });

  it('validates aamarPay through transaction search instead of trusting callback fields', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      providerResponse({
        pay_status: 'Successful',
        request_id: 'FERPAY123',
        amount: '1250.00',
        currency: 'BDT',
        pg_txnid: 'AAM-1',
      }),
    );
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
    const aamarpayCall = (global.fetch as unknown as jest.MockedFunction<typeof fetch>)
      .mock.calls[0];
    expect(aamarpayCall?.[0]).toContain('/api/v1/trxcheck/request.php?');
    const aamarpayHeaders = new Headers(aamarpayCall?.[1]?.headers);
    expect(aamarpayHeaders.get('X-Correlation-ID')).toEqual(expect.any(String));
  });
});
