export type OrderStatus =
  | "PENDING_CONFIRMATION"
  | "CONFIRMED"
  | "CANCELLED"
  | "DELIVERED"
  | "COMPLETED";

export type OrderPaymentStatus =
  | "UNPAID"
  | "PAID"
  | "FAILED"
  | "PARTIALLY_REFUNDED"
  | "REFUNDED";

export type OrderFulfillmentStatus =
  | "UNFULFILLED"
  | "READY_FOR_FULFILLMENT"
  | "PICKING"
  | "PACKED"
  | "QUALITY_CHECKED"
  | "READY_FOR_HANDOVER"
  | "HANDED_OVER"
  | "CANCELLED"
  | "FULFILLED";

export type OrderListItem = {
  id: string;
  reference: string;
  status: OrderStatus;
  paymentStatus: OrderPaymentStatus;
  fulfillmentStatus: OrderFulfillmentStatus;
  codVerification: string;
  total: number;
  paymentMethod: "COD";
  createdAt: string;
  customer: { name: string; phoneNormalized: string };
  address: { district: string; area: string } | null;
  shipment: {
    trackingNumber: string | null;
    provider: { name: string; code: "PATHAO" | "STEADFAST" };
  } | null;
};

export type OrderPage = {
  items: OrderListItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type OrderDetail = {
  id: string;
  reference: string;
  status: OrderStatus;
  paymentStatus: OrderPaymentStatus;
  fulfillmentStatus: OrderFulfillmentStatus;
  shipmentStatus: string;
  returnStatus: string;
  refundStatus: string;
  codVerification: string;
  paymentMethod: "COD";
  currency: "BDT";
  subtotal: number;
  discountTotal: number;
  deliveryFee: number;
  paymentCharge: number;
  total: number;
  source: string | null;
  medium: string | null;
  campaign: string | null;
  cancellationReason: string | null;
  confirmedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  customer: {
    id: string;
    name: string;
    phone: string;
    email: string | null;
  };
  address: {
    recipientName: string;
    phoneOriginal: string;
    phoneNormalized: string;
    email: string | null;
    district: string;
    area: string;
    detailedAddress: string;
    landmark: string | null;
  } | null;
  items: Array<{
    id: string;
    productName: string;
    variantName: string;
    sku: string;
    unitPrice: number;
    quantity: number;
    lineTotal: number;
    discountTotal: number;
    taxTotal: number;
    reservations: Array<{
      id: string;
      quantity: number;
      status: string;
      inventory: { warehouse: { name: string; code: string } };
    }>;
  }>;
  statusHistory: Array<{
    id: string;
    oldStatus: OrderStatus | null;
    newStatus: OrderStatus;
    source: string;
    actorId: string | null;
    note: string | null;
    createdAt: string;
  }>;
  fulfillmentHistory: Array<{
    id: string;
    oldStatus: OrderFulfillmentStatus | null;
    newStatus: OrderFulfillmentStatus;
    source: string;
    actorId: string | null;
    note: string | null;
    createdAt: string;
  }>;
  fulfillmentExceptions: Array<{
    id: string;
    type: "SHORTAGE" | "SUBSTITUTION" | "OTHER";
    status: "OPEN" | "RESOLVED";
    quantity: number | null;
    description: string;
    resolution: string | null;
    createdAt: string;
    resolvedAt: string | null;
    orderItem: { id: string; productName: string; variantName: string } | null;
  }>;
};

export type CodPolicy = {
  id: string;
  mode: "ALWAYS" | "ABOVE_AMOUNT" | "NEVER";
  amountThreshold: number | null;
};

export const orderStatusClass: Record<OrderStatus, string> = {
  PENDING_CONFIRMATION: "bg-amber-50 text-amber-700",
  CONFIRMED: "bg-surface text-ink2",
  CANCELLED: "bg-rose-50 text-rose-700",
  DELIVERED: "bg-emerald-50 text-emerald-700",
  COMPLETED: "bg-emerald-50 text-emerald-700",
};
