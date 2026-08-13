import type {
  OrderFulfillmentStatus,
  OrderPaymentStatus,
  OrderStatus,
} from "@/lib/orders";

export type CustomerRiskIndicator = {
  code: "RTO_HISTORY" | "HIGH_CANCELLATION_RATE" | "REPEAT_RETURN_HISTORY";
  label: string;
};

export type CustomerMetrics = {
  totalOrderCount: number;
  deliveredOrderCount: number;
  cancelledOrderCount: number;
  returnedOrderCount: number;
  rtoOrderCount: number;
  deliveredSpend: number;
  lastPurchaseAt: string | null;
};

export type CustomerListItem = CustomerMetrics & {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  createdAt: string;
  latestAttribution: {
    source: string | null;
    medium: string | null;
    campaign: string | null;
  } | null;
  riskIndicators: CustomerRiskIndicator[];
};

export type CustomerPage = {
  items: CustomerListItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type CustomerDetail = {
  id: string;
  name: string;
  phoneOriginal: string;
  phoneNormalized: string;
  email: string | null;
  createdAt: string;
  updatedAt: string;
  metrics: CustomerMetrics;
  riskIndicators: CustomerRiskIndicator[];
  orderHistoryLimit: number;
  orderHistoryTruncated: boolean;
  _count: { orders: number; addresses: number };
  addresses: Array<{
    id: string;
    label: string | null;
    recipientName: string;
    phoneOriginal: string;
    district: string;
    area: string;
    detailedAddress: string;
    landmark: string | null;
    isDefault: boolean;
  }>;
  orders: Array<{
    id: string;
    reference: string;
    status: OrderStatus;
    paymentStatus: OrderPaymentStatus;
    fulfillmentStatus: OrderFulfillmentStatus;
    shipmentStatus: string;
    returnStatus: string;
    refundStatus: string;
    paymentMethod: "COD" | "PREPAID";
    total: number;
    source: string | null;
    medium: string | null;
    campaign: string | null;
    createdAt: string;
    address: { district: string; area: string } | null;
    _count: { items: number };
  }>;
};
