import type { MetadataRoute } from "next";
import { getCategories, getProducts } from "@/lib/catalog";
import { getStoreConfig } from "@/lib/store";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3002";
  const [categories, products, store] = await Promise.all([
    getCategories().catch(() => []),
    getProducts({ limit: 100 }).then((result) => result.items).catch(() => []),
    getStoreConfig().catch(() => null),
  ]);

  return [
    { url: siteUrl, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/products`, changeFrequency: "daily", priority: 0.9 },
    { url: `${siteUrl}/support`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${siteUrl}/services`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${siteUrl}/policies`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${siteUrl}/delivery`, changeFrequency: "weekly", priority: 0.6 },
    ...(store?.purchaseHistoryEnabled ? [{ url: `${siteUrl}/purchase-history`, changeFrequency: "daily" as const, priority: 0.5 }] : []),
    ...categories.map((category) => ({
      url: `${siteUrl}/products?category=${category.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...products.map((product) => ({
      url: `${siteUrl}/products/${product.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
