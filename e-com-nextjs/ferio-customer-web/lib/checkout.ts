export type DeliveryOption = {
  id: string;
  name: string;
  deliveryFee: number;
  freeDeliveryThreshold: number | null;
  districts: Array<{ id: string; name: string }>;
};

export type CheckoutPreview = {
  draftId: string;
  customer: {
    name: string;
    phone: string;
    email: string | null;
  };
  address: {
    district: string;
    area: string;
    detailedAddress: string;
    landmark: string | null;
  };
  pricing: {
    subtotal: number;
    discountTotal: number;
    deliveryFee: number;
    paymentCharge: number;
    total: number;
  };
  paymentMethod: "COD";
  marketingConsent: boolean;
  expiresAt: string;
  canPlaceOrder: true;
};

export type OrderConfirmation = {
  id: string;
  reference: string;
  status: "PENDING_CONFIRMATION" | "CONFIRMED";
  codVerification: "REQUIRED" | "NOT_REQUIRED";
  paymentMethod: "COD";
  total: number;
  createdAt: string;
};
