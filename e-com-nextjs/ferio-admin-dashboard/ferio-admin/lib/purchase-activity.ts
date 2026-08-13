export type PurchaseActivityItem = {
  id: string;
  productId: string;
  productName: string;
  variantName: string;
  imageUrl: string | null;
  additionalItemCount: number;
  customerName: string;
  location: string | null;
  purchasedAt: string;
  verifiedPurchase: true;
};

export type PurchaseActivityPage = {
  items: PurchaseActivityItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};
