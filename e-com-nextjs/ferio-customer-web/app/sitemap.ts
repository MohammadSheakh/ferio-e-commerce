import type { MetadataRoute } from "next";
import { getCategories, getProducts } from "@/lib/catalog";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const [categories, products] = await Promise.all([
    getCategories().catch(() => []),
    getProducts({ limit: 100 }).then((result) => result.items).catch(() => []),
  ]);

  return [
    { url: siteUrl, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/products`, changeFrequency: "daily", priority: 0.9 },
    { url: `${siteUrl}/support`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${siteUrl}/policies`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${siteUrl}/delivery`, changeFrequency: "weekly", priority: 0.6 },
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
