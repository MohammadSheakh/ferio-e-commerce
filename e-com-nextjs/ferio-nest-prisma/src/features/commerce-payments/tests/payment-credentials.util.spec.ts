import {
  decryptPaymentCredentials,
  encryptPaymentCredentials,
} from '../utils/payment-credentials.util';

describe('payment credential envelope', () => {
  const secret = 'test-payment-credential-key-with-32-chars';

  it('round-trips provider credentials without storing plaintext', () => {
    const credentials = {
      SSLCOMMERZ_STORE_ID: 'store-123',
      SSLCOMMERZ_STORE_PASSWORD: 'secret-value',
    };
    const encrypted = encryptPaymentCredentials(credentials, secret);

    expect(encrypted).not.toContain('secret-value');
    expect(decryptPaymentCredentials(encrypted, secret)).toEqual(credentials);
  });

  it('rejects malformed or tampered envelopes', () => {
    const encrypted = encryptPaymentCredentials(
      { AAMARPAY_STORE_ID: 'store-123' },
      secret,
    );
    const tampered = `${encrypted.slice(0, -2)}aa`;

    expect(() => decryptPaymentCredentials(tampered, secret)).toThrow();
  });
});
