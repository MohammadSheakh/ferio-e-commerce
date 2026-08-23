import { maskPurchaseCustomerName } from './purchase-activity.util';

describe('maskPurchaseCustomerName', () => {
  it('keeps only the first unicode character', () => {
    expect(maskPurchaseCustomerName('  Rahim Uddin ')).toBe('R***');
    expect(maskPurchaseCustomerName('শাওন')).toBe('শ***');
  });

  it('uses a generic label for an empty name', () => {
    expect(maskPurchaseCustomerName('   ')).toBe('A customer');
  });
});
