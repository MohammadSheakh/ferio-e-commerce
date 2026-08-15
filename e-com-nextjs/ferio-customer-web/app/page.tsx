import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import FlashSaleCard from "@/components/FlashSaleCard";
import InteractiveHeroShowcase from "@/components/InteractiveHeroShowcase";
import ProductRequestBanner from "@/components/ProductRequestBanner";
import { getCategories, getProducts } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [categories, products] = await Promise.all([
    getCategories().catch(() => []),
    getProducts({ limit: 4 }).catch(() => ({
      items: [],
      page: 1,
      limit: 4,
      total: 0,
      totalPages: 0,
    })),
  ]);

  return (
    <main>
      {/* Primary Hero Section */}
      <section className="border-b border-line">
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-6 py-20 md:grid-cols-2 md:py-28">
          <div>
            <p className="text-[11px] uppercase tracking-eyebrow text-ink2">New arrivals every week</p>
            <h1 className="mt-5 text-[52px] font-semibold leading-[1.05] tracking-tight text-ink md:text-[60px]">From our shelf<br />to your doorstep.</h1>
            <p className="mt-6 max-w-md text-[15px] leading-relaxed text-ink2">Handpicked products with clear stock and pricing — pay by cash when available, nationwide Bangladesh.</p>
            <div className="mt-9 flex items-center gap-5">
              <Link href="/products" className="rounded-full bg-ink px-7 py-3 text-[14px] font-medium text-white transition hover:opacity-85">Shop the collection</Link>
              <span className="text-[13px] text-ink2">Secure checkout</span>
            </div>
          </div>
          <div className="flex aspect-[4/5] items-center justify-center overflow-hidden rounded-card bg-surface px-10 text-center text-[14px] text-ink2">Published catalog products appear here automatically.</div>
        </div>
      </section>

      {/* get.ru Landing Page Hero Section */}
      <InteractiveHeroShowcase />

      {/* Shop By Category */}
      <section id="categories" className="mx-auto max-w-6xl px-6 py-16">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[22px] font-semibold tracking-tight text-ink">Shop by category</h2>
          <Link href="/products" className="text-[13px] text-ink2 hover:text-ink">View all →</Link>
        </div>
        <div className="mt-7 grid grid-cols-2 gap-3 md:grid-cols-5">
          {categories.map((category) => (
            <Link key={category.id} href={`/products?category=${category.slug}`} className="rounded-card border border-line px-4 py-7 text-center text-[13px] text-ink transition hover:border-ink/30">{category.name}</Link>
          ))}
          {categories.length === 0 && <p className="col-span-full text-[13px] text-ink2">Categories will appear after the catalog is published.</p>}
        </div>
      </section>

      {/* Featured Products Section (Existing, untouched) */}
      <section className="mx-auto max-w-6xl px-6 pb-16">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[22px] font-semibold tracking-tight text-ink">Featured products</h2>
          <Link href="/products" className="text-[13px] text-ink2 hover:text-ink">View all →</Link>
        </div>
        <div className="mt-7 grid grid-cols-2 gap-x-5 gap-y-9 md:grid-cols-4">
          {products.items.map((product) => <ProductCard key={product.id} product={product} />)}
        </div>
        {products.items.length === 0 && <p className="mt-7 text-[13px] text-ink2">Products will appear after an administrator publishes them.</p>}
      </section>

      {/* Custom Product Request Banner */}
      <ProductRequestBanner />

      {/* Exclusive Deals Section */}
      <section className="mx-auto max-w-6xl px-6 py-12 border-t border-line">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[22px] font-semibold tracking-tight text-ink">Exclusive deals</h2>
          <Link href="/products?sale=true" className="text-[13px] text-ink2 hover:text-ink">View all →</Link>
        </div>
        <div className="mt-7 grid grid-cols-2 gap-x-5 gap-y-9 md:grid-cols-4">
          {products.items.map((product) => <ProductCard key={`deal-${product.id}`} product={product} />)}
        </div>
        {products.items.length === 0 && <p className="mt-7 text-[13px] text-ink2">No product found right now.</p>}
      </section>

      {/* Latest Products Section */}
      <section className="mx-auto max-w-6xl px-6 py-12 border-t border-line">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[22px] font-semibold tracking-tight text-ink">Latest products</h2>
          <Link href="/products?sort=newest" className="text-[13px] text-ink2 hover:text-ink">View all →</Link>
        </div>
        <p className="mt-7 text-[13px] text-ink2">No product found right now.</p>
      </section>

      {/* Best Sellers Section */}
      <section className="mx-auto max-w-6xl px-6 py-12 border-t border-line">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[22px] font-semibold tracking-tight text-ink">Best sellers</h2>
          <Link href="/products" className="text-[13px] text-ink2 hover:text-ink">View all →</Link>
        </div>
        <p className="mt-7 text-[13px] text-ink2">No product found right now.</p>
      </section>

      {/* Flash Sale Section */}
      <section className="mx-auto max-w-6xl px-6 py-12 pb-24 border-t border-line">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[22px] font-semibold tracking-tight text-ink">Flash sale</h2>
          <Link href="/products?sale=true" className="text-[13px] text-ink2 hover:text-ink">View all →</Link>
        </div>
        <div className="mt-7 grid grid-cols-2 gap-x-5 gap-y-9 md:grid-cols-4">
          {products.items.map((product, idx) => (
            <FlashSaleCard
              key={`flash-${product.id}`}
              product={product}
              initialDays={12 + idx * 2}
              initialHours={6 + idx * 3}
              initialMinutes={15 + idx * 5}
            />
          ))}
        </div>
        {products.items.length === 0 && <p className="mt-7 text-[13px] text-ink2">No product found right now.</p>}
      </section>
    </main>
  );
}

