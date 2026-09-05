import {
  canCancelOrder,
  canConfirmOrder,
  nextFulfillmentStatus,
  orderStatusLabel,
  shipmentStatusLabel,
  requiresCodVerification,
} from '../order.util';

describe('order rules', () => {
  it('evaluates configurable COD verification', () => {
    expect(requiresCodVerification('ALWAYS', 10000, null)).toBe(true);
    expect(requiresCodVerification('NEVER', 10000, null)).toBe(false);
    expect(requiresCodVerification('ABOVE_AMOUNT', 50000, 50000)).toBe(true);
    expect(requiresCodVerification('ABOVE_AMOUNT', 49999, 50000)).toBe(false);
  });

  it('allows only explicit confirmation and cancellation transitions', () => {
    expect(canConfirmOrder('PENDING_CONFIRMATION')).toBe(true);
    expect(canConfirmOrder('CONFIRMED')).toBe(false);
    expect(canCancelOrder('PENDING_CONFIRMATION')).toBe(true);
    expect(canCancelOrder('CONFIRMED')).toBe(true);
    expect(canCancelOrder('CANCELLED')).toBe(false);
  });

  it('enforces the warehouse fulfillment sequence', () => {
    expect(nextFulfillmentStatus('READY_FOR_FULFILLMENT')).toBe('PICKING');
    expect(nextFulfillmentStatus('PICKING')).toBe('PACKED');
    expect(nextFulfillmentStatus('QUALITY_CHECKED')).toBe('READY_FOR_HANDOVER');
    expect(nextFulfillmentStatus('HANDED_OVER')).toBeNull();
  });

  it('uses customer-safe order and shipment labels', () => {
    expect(orderStatusLabel('PENDING_CONFIRMATION')).toBe('Order received');
    expect(shipmentStatusLabel('OUT_FOR_DELIVERY')).toBe('Out for delivery');
    expect(shipmentStatusLabel('UNKNOWN')).toBe('Courier update under review');
  });
});
