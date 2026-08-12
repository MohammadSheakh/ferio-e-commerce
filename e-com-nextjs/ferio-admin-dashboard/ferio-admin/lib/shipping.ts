export type ShipmentProvider = {
  id: string;
  code: "PATHAO" | "STEADFAST";
  name: string;
  baseUrl: string;
  isActive: boolean;
  configured: boolean;
};

export type ShipmentEvent = {
  id: string;
  rawStatus: string;
  normalizedStatus: string;
  occurredAt: string;
  isOutOfOrder: boolean;
  ignoredReason: string | null;
};

export type Shipment = {
  id: string;
  status: string;
  externalShipmentId: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  labelUrl: string | null;
  weightGrams: number;
  codAmount: number;
  shippingCharge: number | null;
  lastRawStatus: string | null;
  exceptionReason: string | null;
  provider: ShipmentProvider;
  events?: ShipmentEvent[];
  createdAt: string;
  order?: {
    id: string;
    reference: string;
    status: string;
    total: number;
    customer: { name: string; phoneNormalized: string };
    address: { district: string; area: string } | null;
  };
};

export type RtoItem = {
  id: string;
  expectedQuantity: number;
  receivedQuantity: number | null;
  sellableQuantity: number | null;
  damagedQuantity: number | null;
  lostQuantity: number | null;
  note: string | null;
  orderItem: { productName: string; variantName: string; sku: string };
  reservation: { status: string; inventoryId: string };
};

export type RtoCase = {
  id: string;
  reference: string;
  status: "AWAITING_RECEIPT" | "INSPECTED";
  reason: string | null;
  reasonNote: string | null;
  courierReason: string | null;
  outboundCourierCost: number;
  returnCourierCost: number;
  otherCost: number;
  totalCost: number;
  courierReturnedAt: string;
  inspectedAt: string | null;
  shipment: Shipment;
  order: {
    id: string;
    reference: string;
    status: string;
    currency: string;
    customer: { name: string; phoneNormalized: string };
  };
  items: RtoItem[];
};

export const shipmentStatusClass = (status: string) => {
  if (status === "DELIVERED") return "bg-emerald-50 text-emerald-700";
  if (["FAILED", "DELIVERY_FAILED", "RETURNED", "RTO"].includes(status)) {
    return "bg-rose-50 text-rose-700";
  }
  if (["UNKNOWN", "RETURN_IN_PROGRESS"].includes(status)) {
    return "bg-amber-50 text-amber-700";
  }
  return "bg-surface text-ink2";
};
