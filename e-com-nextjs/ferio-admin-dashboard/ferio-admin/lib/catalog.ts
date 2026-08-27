export type CatalogCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
  parentId: string | null;
  _count: { products: number };
};

export type InventoryBreakdown = {
  warehouseId: string;
  warehouseCode: string;
  warehouseName: string;
  onHand: number;
  reserved: number;
  damaged: number;
  incoming: number;
  available: number;
  lowStockThreshold: number;
};

export type CatalogVariant = {
  id: string;
  name: string;
  sku: string;
  attributes: Record<string, string> | null;
  price: number;
  compareAtPrice: number | null;
  availableStock: number;
  isActive: boolean;
  sortOrder: number;
  weightGrams: number | null;
  inventory: InventoryBreakdown[];
};

export type CatalogMedia = {
  id: string;
  url: string;
  altText: string | null;
  type: "IMAGE" | "VIDEO";
  sortOrder: number;
};

export type CatalogBrand = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  isActive: boolean;
  _count?: { products: number };
};

export type CatalogYoutubeReview = {
  id?: string;
  youtubeUrl: string;
  youtubeVideoId?: string;
  title?: string | null;
  reviewerName?: string | null;
  isFeatured?: boolean;
  status?: string;
};

export type CatalogFeature = {
  id?: string;
  title: string;
  description: string;
  image?: string | null;
  tag?: string | null;
  sortOrder?: number;
};

export type CatalogSpecification = {
  id?: string;
  group: string;
  key: string;
  value: string;
  sortOrder?: number;
};

export type CatalogProduct = {
  id: string;
  name: string;
  slug: string;
  description: string;
  brand: string | null;
  brandId?: string | null;
  brandRel?: CatalogBrand | null;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  isFeatured: boolean;
  codAvailable: boolean;
  deliveryNote: string | null;
  returnNote: string | null;
  condition: "NEW" | "SECOND_HAND";
  conditionGrade: "LIKE_NEW" | "GOOD" | "FAIR" | null;
  conditionNote: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  category: CatalogCategory;
  price: number;
  compareAtPrice: number | null;
  availableStock: number;
  variants: CatalogVariant[];
  media: CatalogMedia[];
  youtubeReviews?: CatalogYoutubeReview[];
  features?: CatalogFeature[];
  specifications?: CatalogSpecification[];
  image: string | null;
};

export type ProductPage = {
  items: CatalogProduct[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type InventoryRow = {
  id: string;
  variantId: string;
  sku: string;
  variantName: string;
  product: {
    id: string;
    name: string;
    slug: string;
    status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  };
  warehouse: { id: string; code: string; name: string };
  onHand: number;
  reserved: number;
  damaged: number;
  incoming: number;
  available: number;
  lowStockThreshold: number;
  isLowStock: boolean;
  hasDiscrepancy: boolean;
  movementCount: number;
  updatedAt: string;
};

export type InventoryPage = {
  items: InventoryRow[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  summary: { lowStock: number; discrepancies: number };
};

export type InventoryMovement = {
  id: string;
  type: string;
  quantityDelta: number;
  reason: string;
  adjustmentReason:
    | "STOCK_COUNT_CORRECTION"
    | "PURCHASE_RECEIPT"
    | "CUSTOMER_RETURN"
    | "DAMAGE_WRITE_OFF"
    | "OTHER"
    | null;
  referenceType: string | null;
  referenceId: string | null;
  unitCost: number | null;
  evidenceUrl: string | null;
  effectiveAt: string | null;
  actorId: string | null;
  createdAt: string;
};

export function formatTaka(amountInPaisa: number): string {
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: amountInPaisa % 100 === 0 ? 0 : 2,
  }).format(amountInPaisa / 100);
}
