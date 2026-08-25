import {
  buildCallbackToken,
  verifyCallbackToken,
} from './callback-tenant.util';

describe('callback tenant binding (MT-7 §10.6)', () => {
  const SECRET = 'test-platform-callback-secret-at-least-24-chars!!';

  it('mints and verifies a token for an organization', () => {
    const token = buildCallbackToken('org-acme', SECRET);
    expect(token).toMatch(/^org-acme\./);
    expect(verifyCallbackToken(token, SECRET)).toBe('org-acme');
  });

  it('rejects tokens minted with a different secret', () => {
    const token = buildCallbackToken('org-acme', SECRET);
    expect(
      verifyCallbackToken(token, 'attacker-secret-at-least-24-characters!!'),
    ).toBeNull();
  });

  it.each([
    ['org-other.' + buildCallbackToken('org-acme', SECRET).split('.')[1]],
    ['org-acme.tampered-signature'],
    ['org-acme'],
    [''],
    [undefined],
  ])('rejects tampered/forged token %j', (token) => {
    expect(verifyCallbackToken(token as string | undefined, SECRET)).toBeNull();
  });

  it('refuses to mint without a configured server-side secret', () => {
    expect(() => buildCallbackToken('org-acme', undefined)).toThrow(
      /PLATFORM_CALLBACK_SECRET/,
    );
    expect(() => buildCallbackToken('org-acme', 'short')).toThrow(
      /PLATFORM_CALLBACK_SECRET/,
    );
  });
});
