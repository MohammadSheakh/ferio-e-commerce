import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import { getProducts } from "@/lib/catalog";

export default async function RelatedProductsSection({
  categorySlug,
}: {
  categorySlug?: string;
}) {
  const relatedPage = await getProducts({
    category: categorySlug,
    limit: 6,
  }).catch(() => ({ items: [] }));

  const products = relatedPage.items;

  if (products.length === 0) return null;

  return (
    <section className="mt-16 border-t border-line pt-12 pb-16">
      <div className="flex items-baseline justify-between mb-7">
        <div>
          <h2 className="text-[22px] font-semibold tracking-tight text-ink">
            Related products
          </h2>
          <p className="text-xs text-ink2 mt-1">
            Explore similar items from our catalog
          </p>
        </div>
        <Link
          href={`/products${categorySlug ? `?category=${categorySlug}` : ""}`}
          className="text-[13px] text-ink2 hover:text-ink font-medium"
        >
          View all →
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-x-5 gap-y-9 sm:grid-cols-3 md:grid-cols-6">
        {products.map((prod) => (
          <ProductCard key={`rel-${prod.id}`} product={prod} />
        ))}
      </div>
    </section>
  );
}
