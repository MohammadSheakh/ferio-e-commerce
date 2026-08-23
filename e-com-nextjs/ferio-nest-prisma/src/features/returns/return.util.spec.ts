import { evaluateReturnEligibility } from './return.util';

describe('return eligibility', () => {
  const deliveredAt = new Date('2026-08-01T10:00:00.000Z');

  it('never treats an undelivered order as eligible', () => {
    expect(
      evaluateReturnEligibility({
        orderStatus: 'CONFIRMED',
        deliveredAt: null,
        returnWindowDays: 7,
      }),
    ).toEqual({
      status: 'INELIGIBLE',
      reasons: ['Order has not reached a delivered state'],
      windowEndsAt: null,
    });
  });

  it('requires review when policy or delivery evidence is incomplete', () => {
    expect(
      evaluateReturnEligibility({
        orderStatus: 'DELIVERED',
        deliveredAt,
        returnWindowDays: null,
      }).status,
    ).toBe('REVIEW_REQUIRED');
    expect(
      evaluateReturnEligibility({
        orderStatus: 'DELIVERED',
        deliveredAt: null,
        returnWindowDays: 7,
      }).status,
    ).toBe('REVIEW_REQUIRED');
  });

  it('distinguishes an open window from an expired window', () => {
    expect(
      evaluateReturnEligibility({
        orderStatus: 'DELIVERED',
        deliveredAt,
        returnWindowDays: 7,
        now: new Date('2026-08-07T10:00:00.000Z'),
      }).status,
    ).toBe('ELIGIBLE');
    expect(
      evaluateReturnEligibility({
        orderStatus: 'DELIVERED',
        deliveredAt,
        returnWindowDays: 7,
        now: new Date('2026-08-09T10:00:00.000Z'),
      }).status,
    ).toBe('INELIGIBLE');
  });
});
