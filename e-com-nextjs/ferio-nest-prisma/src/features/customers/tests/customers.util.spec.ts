import {
  customerRiskIndicators,
  maskCustomerEmail,
  maskCustomerPhone,
} from '../customers.util';

describe('customer operations utilities', () => {
  it('masks list-view contact details', () => {
    expect(maskCustomerPhone('+8801712345678')).toBe('+88017****5678');
    expect(maskCustomerEmail('rahim@example.com')).toBe('r***@example.com');
  });

  it('returns only explainable evidence-based indicators', () => {
    expect(
      customerRiskIndicators({
        totalOrderCount: 4,
        deliveredOrderCount: 1,
        cancelledOrderCount: 2,
        returnedOrderCount: 2,
        rtoOrderCount: 1,
        deliveredSpend: 10000,
        lastPurchaseAt: new Date(),
      }),
    ).toEqual([
      { code: 'RTO_HISTORY', label: 'Has RTO history' },
      {
        code: 'HIGH_CANCELLATION_RATE',
        label: 'Cancellation rate is 50% or higher',
      },
      { code: 'REPEAT_RETURN_HISTORY', label: 'Has multiple return cases' },
    ]);
  });
});
