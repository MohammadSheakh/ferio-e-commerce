export type CommerceAccount = {
  account: {
    id: string;
    name: string;
    email: string;
    phoneNumber: string | null;
    isEmailVerified: boolean;
  };
  linked: boolean;
  customer: {
    id: string;
    name: string;
    phoneNormalized: string;
    email: string | null;
    _count: { orders: number };
    addresses: Array<{
      id: string;
      label: string | null;
      recipientName: string;
      district: string;
      area: string;
      detailedAddress: string;
      landmark: string | null;
      isDefault: boolean;
    }>;
    orders: Array<{
      id: string;
      reference: string;
      status: string;
      paymentStatus: string;
      fulfillmentStatus: string;
      shipmentStatus: string;
      returnStatus: string;
      refundStatus: string;
      paymentMethod: "COD" | "PREPAID";
      total: number;
      createdAt: string;
      address: { district: string; area: string } | null;
      items: Array<{
        id: string;
        productName: string;
        variantName: string;
        imageUrl: string | null;
        quantity: number;
        lineTotal: number;
      }>;
      shipment: {
        trackingNumber: string | null;
        provider: { name: string };
      } | null;
    }>;
  } | null;
  orderHistoryLimit: number;
  orderHistoryTruncated: boolean;
};
