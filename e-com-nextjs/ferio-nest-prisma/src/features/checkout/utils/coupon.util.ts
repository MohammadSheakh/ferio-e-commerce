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

function isCouponRule(value: unknown): value is CouponRule {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const rule = value as Record<string, unknown>;
  return (
    typeof rule.code === 'string' &&
    (rule.type === 'FIXED' || rule.type === 'PERCENT') &&
    typeof rule.value === 'number' &&
    (rule.minimumSubtotal === undefined || typeof rule.minimumSubtotal === 'number') &&
    (rule.maximumDiscount === undefined || typeof rule.maximumDiscount === 'number') &&
    (rule.startsAt === undefined || typeof rule.startsAt === 'string') &&
    (rule.endsAt === undefined || typeof rule.endsAt === 'string') &&
    (rule.active === undefined || typeof rule.active === 'boolean')
  );
}

export function calculateCouponDiscount(
  rawRules: string | undefined,
  requestedCode: string | undefined,
  subtotal: number,
  now = new Date(),
) {
  const code = requestedCode?.normalize('NFKC').trim().toUpperCase();
  if (!code) return { couponCode: null, discountTotal: 0 };

  let parsedRules: unknown;
  try {
    parsedRules = JSON.parse(rawRules || '[]');
  } catch {
    throw new Error('CHECKOUT_COUPONS_JSON must contain valid JSON');
  }
  if (!Array.isArray(parsedRules) || !parsedRules.every(isCouponRule)) {
    throw new Error('CHECKOUT_COUPONS_JSON contains an invalid coupon rule');
  }
  const rules = parsedRules;
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
