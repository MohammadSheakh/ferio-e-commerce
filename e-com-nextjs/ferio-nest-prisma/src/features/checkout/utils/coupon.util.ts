import { BadRequestException } from '@nestjs/common';

export type CouponRule = {
  code: string;
  type: 'FIXED' | 'PERCENT';
  value: number;
  minimumSubtotal?: number;
  maximumDiscount?: number;
  startsAt?: string;
  endsAt?: string;
  active?: boolean;
};

export function calculateCouponDiscount(
  rawRules: string | undefined,
  requestedCode: string | undefined,
  subtotal: number,
  now = new Date(),
) {
  const code = requestedCode?.normalize('NFKC').trim().toUpperCase();
  if (!code) return { couponCode: null, discountTotal: 0 };

  let rules: CouponRule[];
  try {
    rules = JSON.parse(rawRules || '[]') as CouponRule[];
  } catch {
    throw new Error('CHECKOUT_COUPONS_JSON must contain valid JSON');
  }
  const rule = rules.find(
    (item) => item.code?.normalize('NFKC').trim().toUpperCase() === code,
  );
  if (!rule || rule.active === false) {
    throw new BadRequestException('Coupon code is invalid or inactive');
  }
  if (
    !Number.isInteger(rule.value) ||
    rule.value <= 0 ||
    !['FIXED', 'PERCENT'].includes(rule.type)
  ) {
    throw new Error(`Coupon ${code} has an invalid server configuration`);
  }
  if (rule.startsAt && now < new Date(rule.startsAt)) {
    throw new BadRequestException('Coupon is not active yet');
  }
  if (rule.endsAt && now > new Date(rule.endsAt)) {
    throw new BadRequestException('Coupon has expired');
  }
  if (subtotal < (rule.minimumSubtotal ?? 0)) {
    throw new BadRequestException('Cart does not meet the coupon minimum');
  }
  let discount =
    rule.type === 'FIXED'
      ? rule.value
      : Math.floor((subtotal * Math.min(rule.value, 100)) / 100);
  if (rule.maximumDiscount !== undefined) {
    discount = Math.min(discount, Math.max(0, rule.maximumDiscount));
  }
  return { couponCode: code, discountTotal: Math.min(subtotal, discount) };
}
