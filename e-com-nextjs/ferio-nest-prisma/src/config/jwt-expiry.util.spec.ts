import { jwtExpirySeconds } from './jwt-expiry.util';

describe('jwtExpirySeconds', () => {
  it.each([
    ['15s', 15],
    ['15m', 900],
    ['2h', 7200],
    ['7d', 604800],
  ])('converts %s to seconds', (value, expected) => {
    expect(jwtExpirySeconds(value, '15m')).toBe(expected);
  });

  it('uses the validated fallback when the supplied value is invalid', () => {
    expect(jwtExpirySeconds('invalid', '15m')).toBe(900);
  });

  it('rejects invalid fallback configuration', () => {
    expect(() => jwtExpirySeconds('invalid', 'also-invalid')).toThrow(
      'JWT_EXPIRY_INVALID',
    );
  });
});
