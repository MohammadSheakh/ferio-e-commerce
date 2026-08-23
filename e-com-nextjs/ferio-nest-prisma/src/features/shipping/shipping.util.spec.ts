import {
  canApplyShipmentStatus,
  normalizeCourierStatus,
} from './shipping.util';

describe('shipping status rules', () => {
  it('normalizes Steadfast and Pathao provider statuses', () => {
    expect(normalizeCourierStatus('STEADFAST', 'delivered')).toBe('DELIVERED');
    expect(normalizeCourierStatus('STEADFAST', 'hold')).toBe('DELIVERY_FAILED');
    expect(normalizeCourierStatus('PATHAO', 'order.picked')).toBe('PICKED_UP');
    expect(normalizeCourierStatus('PATHAO', 'order.returned')).toBe('RTO');
    expect(normalizeCourierStatus('PATHAO', 'new-provider-state')).toBe(
      'UNKNOWN',
    );
  });

  it('prevents terminal regression but permits failed-delivery retry', () => {
    expect(canApplyShipmentStatus('OUT_FOR_DELIVERY', 'DELIVERY_FAILED')).toBe(
      true,
    );
    expect(canApplyShipmentStatus('DELIVERY_FAILED', 'OUT_FOR_DELIVERY')).toBe(
      true,
    );
    expect(canApplyShipmentStatus('DELIVERY_FAILED', 'RTO')).toBe(true);
    expect(canApplyShipmentStatus('DELIVERED', 'IN_TRANSIT')).toBe(false);
    expect(canApplyShipmentStatus('IN_TRANSIT', 'UNKNOWN')).toBe(false);
  });
});
