import { OrderShipmentStatus, ShipmentProviderCode } from '@prisma/client';
import { createHash, timingSafeEqual } from 'crypto';

export function secureWebhookCredentialEquals(
  provided: string,
  expected: string,
): boolean {
  const providedDigest = createHash('sha256').update(provided).digest();
  const expectedDigest = createHash('sha256').update(expected).digest();
  return timingSafeEqual(providedDigest, expectedDigest);
}

export function shippingText(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return fallback;
}

const steadfastStatuses: Record<string, OrderShipmentStatus> = {
  in_review: 'CREATED',
  pending: 'CREATED',
  delivered_approval_pending: 'DELIVERED',
  delivered: 'DELIVERED',
  cancelled_approval_pending: 'DELIVERY_FAILED',
  cancelled: 'RETURN_IN_PROGRESS',
  hold: 'DELIVERY_FAILED',
  partial_delivered_approval_pending: 'UNKNOWN',
  partial_delivered: 'UNKNOWN',
  unknown_approval_pending: 'UNKNOWN',
  unknown: 'UNKNOWN',
};

const pathaoStatuses: Record<string, OrderShipmentStatus> = {
  pending: 'CREATED',
  created: 'CREATED',
  'order.created': 'CREATED',
  'order.picked': 'PICKED_UP',
  'order.in-transit': 'IN_TRANSIT',
  'order.at-hub': 'AT_HUB',
  'order.assigned-for-delivery': 'OUT_FOR_DELIVERY',
  'order.delivered': 'DELIVERED',
  'order.delivery-failed': 'DELIVERY_FAILED',
  'order.returning': 'RETURN_IN_PROGRESS',
  'order.returned': 'RTO',
  'order.partial-delivery': 'UNKNOWN',
};

const redxStatuses: Record<string, OrderShipmentStatus> = {
  parcel_created: 'CREATED',
  'ready-for-delivery': 'CREATED',
  pickup_requested: 'CREATED',
  pickup_in_progress: 'CREATED',
  picked_up: 'PICKED_UP',
  in_transit: 'IN_TRANSIT',
  received_at_hub: 'AT_HUB',
  out_for_delivery: 'OUT_FOR_DELIVERY',
  'delivery-in-progress': 'OUT_FOR_DELIVERY',
  delivered: 'DELIVERED',
  paid: 'DELIVERED',
  delivery_failed: 'DELIVERY_FAILED',
  'agent-hold': 'DELIVERY_FAILED',
  returning: 'RETURN_IN_PROGRESS',
  'agent-returning': 'RETURN_IN_PROGRESS',
  returned: 'RTO',
  cancelled: 'CANCELLED',
};

const ecourierStatuses: Record<string, OrderShipmentStatus> = {
  pending: 'CREATED',
  pick_up_request: 'CREATED',
  picked: 'PICKED_UP',
  in_transit: 'IN_TRANSIT',
  hub_received: 'AT_HUB',
  out_for_delivery: 'OUT_FOR_DELIVERY',
  delivered: 'DELIVERED',
  failed: 'DELIVERY_FAILED',
  returning: 'RETURN_IN_PROGRESS',
  returned: 'RTO',
  cancelled: 'CANCELLED',
};

const paperflyStatuses: Record<string, OrderShipmentStatus> = {
  order_created: 'CREATED',
  picked_up: 'PICKED_UP',
  in_transit: 'IN_TRANSIT',
  at_hub: 'AT_HUB',
  out_for_delivery: 'OUT_FOR_DELIVERY',
  delivered: 'DELIVERED',
  delivery_failed: 'DELIVERY_FAILED',
  returning: 'RETURN_IN_PROGRESS',
  returned: 'RTO',
  cancelled: 'CANCELLED',
};

const carrybeeStatuses: Record<string, OrderShipmentStatus> = {
  order_created: 'CREATED',
  pending: 'CREATED',
  picked_up: 'PICKED_UP',
  in_transit: 'IN_TRANSIT',
  at_hub: 'AT_HUB',
  out_for_delivery: 'OUT_FOR_DELIVERY',
  delivered: 'DELIVERED',
  delivery_failed: 'DELIVERY_FAILED',
  returning: 'RETURN_IN_PROGRESS',
  returned: 'RTO',
  cancelled: 'CANCELLED',
};

export function normalizeCourierStatus(
  provider: ShipmentProviderCode,
  rawStatus: string,
): OrderShipmentStatus {
  const normalized = rawStatus.trim().toLowerCase();
  switch (provider) {
    case 'STEADFAST':
      return steadfastStatuses[normalized] ?? 'UNKNOWN';
    case 'PATHAO':
      return pathaoStatuses[normalized] ?? 'UNKNOWN';
    case 'REDX':
      return redxStatuses[normalized] ?? 'UNKNOWN';
    case 'ECOURIER':
      return ecourierStatuses[normalized] ?? 'UNKNOWN';
    case 'PAPERFLY':
      return paperflyStatuses[normalized] ?? 'UNKNOWN';
    case 'CARRYBEE':
      return carrybeeStatuses[normalized] ?? 'UNKNOWN';
    default:
      return 'UNKNOWN';
  }
}

export function canApplyShipmentStatus(
  current: OrderShipmentStatus,
  next: OrderShipmentStatus,
): boolean {
  if (next === 'UNKNOWN') return false;
  if (current === next) return true;
  if (['DELIVERED', 'RETURNED', 'CANCELLED', 'RTO'].includes(current)) {
    return false;
  }
  const allowed: Partial<Record<OrderShipmentStatus, OrderShipmentStatus[]>> = {
    NOT_CREATED: ['READY', 'CREATED'],
    READY: ['CREATED', 'FAILED'],
    CREATED: ['PICKED_UP', 'IN_TRANSIT', 'DELIVERY_FAILED', 'CANCELLED'],
    PICKED_UP: ['IN_TRANSIT', 'AT_HUB', 'DELIVERY_FAILED'],
    IN_TRANSIT: [
      'AT_HUB',
      'OUT_FOR_DELIVERY',
      'DELIVERY_FAILED',
      'RETURN_IN_PROGRESS',
    ],
    AT_HUB: [
      'IN_TRANSIT',
      'OUT_FOR_DELIVERY',
      'DELIVERY_FAILED',
      'RETURN_IN_PROGRESS',
    ],
    OUT_FOR_DELIVERY: ['DELIVERED', 'DELIVERY_FAILED', 'RETURN_IN_PROGRESS'],
    DELIVERY_FAILED: [
      'OUT_FOR_DELIVERY',
      'RETURN_IN_PROGRESS',
      'RETURNED',
      'RTO',
    ],
    RETURN_IN_PROGRESS: ['RETURNED', 'RTO'],
    FAILED: ['READY', 'CREATED'],
    UNKNOWN: ['CREATED', 'PICKED_UP', 'IN_TRANSIT'],
  };
  return allowed[current]?.includes(next) ?? false;
}
