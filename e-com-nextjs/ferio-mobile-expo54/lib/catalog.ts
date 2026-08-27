import { apiGet } from "@/lib/api";
import type { CatalogCategory, CatalogProduct, CatalogProductPage } from "@/types/catalog";

export function formatTaka(amountInPaisa: number) {
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: amountInPaisa % 100 === 0 ? 0 : 2,
  }).format(amountInPaisa / 100);
}

export const getCategories = () => apiGet<CatalogCategory[]>("/catalog/categories");

export function getProducts(params: Record<string, string | number | boolean | undefined> = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.set(key, String(value));
  });
  return apiGet<CatalogProductPage>(`/catalog/products${query.size ? `?${query}` : ""}`);
}

export const getProduct = (slug: string) => apiGet<CatalogProduct>(`/catalog/products/${slug}`);
