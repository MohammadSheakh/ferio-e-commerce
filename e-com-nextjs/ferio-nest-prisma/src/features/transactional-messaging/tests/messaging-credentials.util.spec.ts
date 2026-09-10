import {
  decryptMessagingCredentials,
  encryptMessagingCredentials,
} from '../utils/messaging-credentials.util';

describe('messaging credentials encryption', () => {
  const secret = 'a'.repeat(32);

  it('round-trips credentials without exposing plaintext in the envelope', () => {
    const credentials = { apiKey: 'secret-key', senderId: 'ferio' };
    const cipher = encryptMessagingCredentials(credentials, secret);

    expect(cipher).not.toContain('secret-key');
    expect(decryptMessagingCredentials(cipher, secret)).toEqual(credentials);
  });

  it('rejects a tampered envelope', () => {
    const cipher = encryptMessagingCredentials(
      { apiKey: 'secret-key' },
      secret,
    );
    const tampered = `${cipher.slice(0, -2)}aa`;

    expect(() => decryptMessagingCredentials(tampered, secret)).toThrow();
  });
});
