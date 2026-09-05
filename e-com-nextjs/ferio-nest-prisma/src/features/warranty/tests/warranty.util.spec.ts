import { canTransitionWarranty } from '../utils/warranty.util';
describe('warranty transitions', () => {
  it('allows repair and brand workflows', () => {
    expect(canTransitionWarranty('SUBMITTED', 'PRODUCT_RECEIVED')).toBe(true);
    expect(canTransitionWarranty('SENT_TO_BRAND', 'RECEIVED_FROM_BRAND')).toBe(
      true,
    );
    expect(canTransitionWarranty('REPAIRED', 'RESOLVED')).toBe(true);
  });
  it('blocks terminal and skipped transitions', () => {
    expect(canTransitionWarranty('RESOLVED', 'REPAIRED')).toBe(false);
    expect(canTransitionWarranty('SUBMITTED', 'RESOLVED')).toBe(false);
  });
});
