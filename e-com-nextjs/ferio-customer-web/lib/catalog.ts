import { getPublicApi } from "@/lib/backend";

export type CatalogCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId?: string | null;
  sortOrder?: number;
  isActive?: boolean;
  _count?: { products: number };
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
  seoTitle: string | null;
  seoDescription: string | null;
  category: CatalogCategory;
  variants: CatalogVariant[];
  variantId: string;
  sku: string;
  price: number;
  compareAtPrice: number | null;
  availableStock: number;
  image: string | null;
  images: string[];
  features?: CatalogFeature[];
  specifications?: CatalogSpecification[];
  selectedVariantName?: string;
};

export type CatalogProductPage = {
  items: CatalogProduct[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export function formatTaka(amountInPaisa: number): string {
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: amountInPaisa % 100 === 0 ? 0 : 2,
  }).format(amountInPaisa / 100);
}

export function getCategories(): Promise<CatalogCategory[]> {
  return getPublicApi<CatalogCategory[]>("/catalog/categories", {
    next: { revalidate: 60 },
  });
}

export function getProducts(params?: {
  category?: string;
  search?: string;
  featured?: boolean;
  condition?: "NEW" | "SECOND_HAND";
  limit?: number;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  sort?: "newest" | "price-asc" | "price-desc" | "name-asc";
  attributeKey?: string;
  attributeValue?: string;
}): Promise<CatalogProductPage> {
  const query = new URLSearchParams();
  if (params?.category) query.set("category", params.category);
  if (params?.search) query.set("search", params.search);
  if (params?.featured !== undefined) {
    query.set("featured", String(params.featured));
  }
  if (params?.condition) query.set("condition", params.condition);
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.minPrice !== undefined) {
    query.set("minPrice", String(Math.round(params.minPrice * 100)));
  }
  if (params?.maxPrice !== undefined) {
    query.set("maxPrice", String(Math.round(params.maxPrice * 100)));
  }
  if (params?.inStock) query.set("inStock", "true");
  if (params?.sort) query.set("sort", params.sort);
  if (params?.attributeKey) query.set("attributeKey", params.attributeKey);
  if (params?.attributeValue) query.set("attributeValue", params.attributeValue);
  const suffix = query.size ? `?${query.toString()}` : "";
  return getPublicApi<CatalogProductPage>(`/catalog/products${suffix}`, {
    next: { revalidate: 60 },
  });
}

export function getProduct(slug: string): Promise<CatalogProduct> {
  return getPublicApi<CatalogProduct>(`/catalog/products/${slug}`, {
    next: { revalidate: 60 },
  });
}

export function selectVariant(
  product: CatalogProduct,
  variant: CatalogVariant,
): CatalogProduct {
  return {
    ...product,
    variantId: variant.id,
    sku: variant.sku,
    price: variant.price,
    compareAtPrice: variant.compareAtPrice,
    availableStock: variant.availableStock,
    selectedVariantName: variant.name,
  };
}
