import { toPlatformJsonInput } from './json-input.util';

describe('toPlatformJsonInput', () => {
  it('preserves JSON primitives and omits undefined/null values', () => {
    expect(toPlatformJsonInput('value')).toBe('value');
    expect(toPlatformJsonInput(12)).toBe(12);
    expect(toPlatformJsonInput(true)).toBe(true);
    expect(toPlatformJsonInput(null)).toBeUndefined();
    expect(toPlatformJsonInput(undefined)).toBeUndefined();
  });

  it('normalizes dates and nested records', () => {
    expect(
      toPlatformJsonInput({
        createdAt: new Date('2026-01-02T03:04:05.000Z'),
        nested: { enabled: true, omitted: undefined },
      }),
    ).toEqual({
      createdAt: '2026-01-02T03:04:05.000Z',
      nested: { enabled: true },
    });
  });

  it('keeps array positions stable when values are nullish', () => {
    expect(toPlatformJsonInput([1, undefined, null, 'four'])).toEqual([
      1,
      null,
      null,
      'four',
    ]);
  });

  it('serializes unsupported primitive-like values instead of bypassing Prisma types', () => {
    expect(toPlatformJsonInput(BigInt(42))).toBe('42');
  });
});
