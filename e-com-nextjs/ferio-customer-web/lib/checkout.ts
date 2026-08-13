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
  paymentMethod: "COD" | "PREPAID";
  paymentProvider: "SSLCOMMERZ" | "AAMARPAY" | null;
  marketingConsent: boolean;
  purchaseActivityConsent: boolean;
  customerNote: string | null;
  expiresAt: string;
  canPlaceOrder: true;
};

export type OrderConfirmation = {
  id: string;
  reference: string;
  status: "PENDING_CONFIRMATION" | "CONFIRMED";
  codVerification: "REQUIRED" | "NOT_REQUIRED";
  paymentMethod: "COD" | "PREPAID";
  total: number;
  createdAt: string;
};

export type PaymentOptions = {
  methods: { cod: boolean; prepaid: boolean };
  providers: Array<{ code: "SSLCOMMERZ" | "AAMARPAY"; name: string; configured: boolean }>;
};

export type CheckoutOrderResult = OrderConfirmation & {
  payment?: { provider: "SSLCOMMERZ" | "AAMARPAY"; status: string; redirectUrl: string | null };
};
