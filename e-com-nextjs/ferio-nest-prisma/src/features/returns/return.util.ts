import { OrderStatus, ReturnEligibilityStatus } from '@prisma/client';

type EligibilityInput = {
  orderStatus: OrderStatus;
  deliveredAt: Date | null;
  returnWindowDays: number | null;
  now?: Date;
};

export function evaluateReturnEligibility(input: EligibilityInput): {
  status: ReturnEligibilityStatus;
  reasons: string[];
  windowEndsAt: Date | null;
} {
  if (!['DELIVERED', 'COMPLETED'].includes(input.orderStatus)) {
    return {
      status: 'INELIGIBLE',
      reasons: ['Order has not reached a delivered state'],
      windowEndsAt: null,
    };
  }
  if (!input.deliveredAt) {
    return {
      status: 'REVIEW_REQUIRED',
      reasons: ['Delivery timestamp is unavailable'],
      windowEndsAt: null,
    };
  }
  if (input.returnWindowDays === null) {
    return {
      status: 'REVIEW_REQUIRED',
      reasons: ['Default return window is not approved'],
      windowEndsAt: null,
    };
  }
  const windowEndsAt = new Date(
    input.deliveredAt.getTime() + input.returnWindowDays * 24 * 60 * 60 * 1000,
  );
  if ((input.now ?? new Date()) > windowEndsAt) {
    return {
      status: 'INELIGIBLE',
      reasons: ['Configured return window has ended'],
      windowEndsAt,
    };
  }
  return {
    status: 'ELIGIBLE',
    reasons: ['Within the configured return window'],
    windowEndsAt,
  };
}
