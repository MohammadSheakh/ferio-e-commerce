import { BadRequestException } from '@nestjs/common';
import { calculateCouponDiscount } from '../utils/coupon.util';

const rules = JSON.stringify([
  {
    code: 'SAVE10',
    type: 'PERCENT',
    value: 10,
    minimumSubtotal: 10000,
    maximumDiscount: 2500,
  },
  {
    code: 'LESS500',
    type: 'FIXED',
    value: 500,
    endsAt: '2026-12-31T23:59:59Z',
  },
]);

describe('calculateCouponDiscount', () => {
  it('normalizes codes and caps percentage discounts', () => {
    expect(calculateCouponDiscount(rules, ' save10 ', 50000)).toEqual({
      couponCode: 'SAVE10',
      discountTotal: 2500,
    });
  });

  it('calculates a fixed discount in minor units', () => {
    expect(
      calculateCouponDiscount(
        rules,
        'LESS500',
        4000,
        new Date('2026-08-21T00:00:00Z'),
      ),
    ).toEqual({ couponCode: 'LESS500', discountTotal: 500 });
  });

  it('rejects unknown, expired, and below-minimum coupons', () => {
    expect(() => calculateCouponDiscount(rules, 'UNKNOWN', 50000)).toThrow(
      BadRequestException,
    );
    expect(() => calculateCouponDiscount(rules, 'SAVE10', 9000)).toThrow(
      'Cart does not meet the coupon minimum',
    );
    expect(() =>
      calculateCouponDiscount(
        rules,
        'LESS500',
        4000,
        new Date('2027-01-01T00:00:00Z'),
      ),
    ).toThrow('Coupon has expired');
  });

  it('never discounts below zero and treats a blank code as no coupon', () => {
    const fixed = JSON.stringify([
      { code: 'FREE', type: 'FIXED', value: 9999 },
    ]);
    expect(calculateCouponDiscount(fixed, 'FREE', 1200).discountTotal).toBe(
      1200,
    );
    expect(calculateCouponDiscount(rules, '  ', 1200)).toEqual({
      couponCode: null,
      discountTotal: 0,
    });
  });

  it('rejects malformed coupon configuration instead of trusting parsed JSON', () => {
    expect(() =>
      calculateCouponDiscount(
        JSON.stringify([{ code: 'BROKEN', type: 'PERCENT', value: '10' }]),
        'BROKEN',
        1000,
      ),
    ).toThrow('CHECKOUT_COUPONS_JSON contains an invalid coupon rule');
  });
});
