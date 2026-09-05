import { BadRequestException } from '@nestjs/common';
import {
  calculateDeliveryFee,
  normalizeBangladeshPhone,
  normalizeDistrict,
} from '../utils/checkout.util';

describe('checkout utilities', () => {
  it.each([
    ['01712345678', '+8801712345678'],
    ['8801712345678', '+8801712345678'],
    ['+880 1712-345678', '+8801712345678'],
  ])('normalizes Bangladesh phone %s', (input, expected) => {
    expect(normalizeBangladeshPhone(input)).toBe(expected);
  });

  it('rejects invalid Bangladesh mobile numbers', () => {
    expect(() => normalizeBangladeshPhone('01212345678')).toThrow(
      BadRequestException,
    );
  });

  it('normalizes Unicode district labels safely', () => {
    expect(normalizeDistrict('  Dhaka   City ')).toBe('dhaka city');
  });

  it('applies delivery fees and free-delivery thresholds', () => {
    expect(calculateDeliveryFee(49999, 8000, 50000)).toBe(8000);
    expect(calculateDeliveryFee(50000, 8000, 50000)).toBe(0);
    expect(calculateDeliveryFee(50000, 8000, null)).toBe(8000);
  });
});
