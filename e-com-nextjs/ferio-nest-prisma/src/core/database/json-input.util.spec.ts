import { toTenantJsonInput } from './json-input.util';

describe('toTenantJsonInput', () => {
  it('normalizes supported JSON values and omits nullish values', () => {
    expect(
      toTenantJsonInput({
        text: 'value',
        count: 12,
        enabled: true,
        missing: undefined,
        empty: null,
        at: new Date('2026-09-05T00:00:00.000Z'),
        nested: [1, undefined, null, 'four'],
      }),
    ).toEqual({
      text: 'value',
      count: 12,
      enabled: true,
      at: '2026-09-05T00:00:00.000Z',
      nested: [1, null, null, 'four'],
    });
  });

  it('returns undefined for a nullish root value', () => {
    expect(toTenantJsonInput(null)).toBeUndefined();
    expect(toTenantJsonInput(undefined)).toBeUndefined();
  });

  it('stringifies unsupported primitive values', () => {
    expect(toTenantJsonInput(BigInt(42))).toBe('42');
  });
});
