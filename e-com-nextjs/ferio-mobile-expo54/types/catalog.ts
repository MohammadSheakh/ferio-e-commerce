export type CatalogCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId?: string | null;
  sortOrder?: number | null;
  isActive?: boolean;
};

export type CatalogVariant = {
  id: string;
  name: string;
  sku: string;
  attributes: Record<string, string> | null;
  price: number;
  compareAtPrice: number | null;
  isActive: boolean;
  availableStock: number;
};

export type CatalogYoutubeReview = {
  id: string;
  youtubeUrl?: string;
  youtubeVideoId: string;
  title: string | null;
  reviewerName: string | null;
  isFeatured: boolean;
};

export type CatalogProduct = {
  id: string;
  slug: string;
  name: string;
  description: string;
  brand: string | null;
  codAvailable: boolean;
  deliveryNote: string | null;
  returnNote: string | null;
  condition: "NEW" | "SECOND_HAND";
  conditionGrade: "LIKE_NEW" | "GOOD" | "FAIR" | null;
  conditionNote: string | null;
  category: CatalogCategory;
  variants: CatalogVariant[];
  variantId: string;
  sku: string;
  price: number;
  compareAtPrice: number | null;
  availableStock: number;
  image: string | null;
  images: string[];
  selectedVariantName?: string;
  youtubeReviews?: CatalogYoutubeReview[];
};

export type CatalogProductPage = {
  items: CatalogProduct[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};
