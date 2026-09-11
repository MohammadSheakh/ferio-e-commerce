export type TrackingEvent = {
  code: string;
  label: string;
  occurredAt: string;
};

export type OrderTracking = {
  reference: string;
  status: string;
  statusLabel: string;
  paymentMethod: "COD" | "PREPAID" | "PAY_AT_STORE";
  total: number;
  currency: "BDT";
  createdAt: string;
  shipment: {
    provider: string;
    status: string;
    statusLabel: string;
    trackingNumber: string | null;
    trackingUrl: string | null;
  } | null;
  timeline: TrackingEvent[];
};
