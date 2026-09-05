import {
  CodVerificationMode,
  OrderFulfillmentStatus,
  OrderShipmentStatus,
  OrderStatus,
} from '@prisma/client';

const fulfillmentSequence: Partial<
  Record<OrderFulfillmentStatus, OrderFulfillmentStatus>
> = {
  READY_FOR_FULFILLMENT: 'PICKING',
  PICKING: 'PACKED',
  PACKED: 'QUALITY_CHECKED',
  QUALITY_CHECKED: 'READY_FOR_HANDOVER',
  READY_FOR_HANDOVER: 'HANDED_OVER',
};

export function requiresCodVerification(
  mode: CodVerificationMode,
  total: number,
  amountThreshold: number | null,
): boolean {
  if (mode === 'ALWAYS') return true;
  if (mode === 'NEVER') return false;
  return amountThreshold === null || total >= amountThreshold;
}

export function canConfirmOrder(status: OrderStatus): boolean {
  return status === 'PENDING_CONFIRMATION';
}

export function canCancelOrder(status: OrderStatus): boolean {
  return status === 'PENDING_CONFIRMATION' || status === 'CONFIRMED';
}

export function nextFulfillmentStatus(
  status: OrderFulfillmentStatus,
): OrderFulfillmentStatus | null {
  return fulfillmentSequence[status] ?? null;
}

export function orderStatusLabel(status: OrderStatus): string {
  const labels: Record<OrderStatus, string> = {
    PENDING_CONFIRMATION: 'Order received',
    CONFIRMED: 'Order confirmed',
    CANCELLED: 'Order cancelled',
    DELIVERED: 'Order delivered',
    COMPLETED: 'Order completed',
  };
  return labels[status];
}

export function shipmentStatusLabel(status: OrderShipmentStatus): string {
  const labels: Record<OrderShipmentStatus, string> = {
    NOT_CREATED: 'Preparing your order',
    READY: 'Parcel ready',
    CREATED: 'Courier booking created',
    PICKED_UP: 'Parcel handed to courier',
    IN_TRANSIT: 'Parcel in transit',
    AT_HUB: 'Parcel at courier hub',
    OUT_FOR_DELIVERY: 'Out for delivery',
    DELIVERED: 'Delivered',
    DELIVERY_FAILED: 'Delivery attempt unsuccessful',
    RETURN_IN_PROGRESS: 'Parcel returning to sender',
    RETURNED: 'Parcel returned to sender',
    CANCELLED: 'Shipment cancelled',
    FAILED: 'Shipment booking failed',
    RTO: 'Return to origin',
    UNKNOWN: 'Courier update under review',
  };
  return labels[status];
}
