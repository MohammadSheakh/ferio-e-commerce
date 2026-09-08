import { ConfigService } from '@nestjs/config';
import {
  decryptCourierCredentials,
  encryptCourierCredentials,
  runWithCourierCredentials,
  tenantAwareCourierConfig,
} from '../utils/courier-credentials.util';

describe('courier credential envelope', () => {
  const secret = 'test-courier-credential-key-with-32-chars';

  it('round-trips credentials without storing plaintext', () => {
    const credentials = { REDX_API_TOKEN: 'token-value', REDX_WEBHOOK_SECRET: 'webhook-value' };
    const encrypted = encryptCourierCredentials(credentials, secret);

    expect(encrypted).not.toContain('token-value');
    expect(decryptCourierCredentials(encrypted, secret)).toEqual(credentials);
  });

  it('overlays tenant values only for the current async operation', async () => {
    const config = tenantAwareCourierConfig(new ConfigService({ REDX_API_TOKEN: 'global' }));

    await runWithCourierCredentials({ REDX_API_TOKEN: 'tenant-a' }, async () => {
      expect(config.get('REDX_API_TOKEN')).toBe('tenant-a');
      await Promise.resolve();
      expect(config.getOrThrow('REDX_API_TOKEN')).toBe('tenant-a');
    });
    expect(config.get('REDX_API_TOKEN')).toBe('global');
  });
});
