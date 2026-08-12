import type { Metadata } from "next";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import { getCategories, getProducts } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Shop all products | Ferio",
  description: "Browse published Ferio products with current prices, variants, and availability.",
};

type ProductSearchParams = {
  category?: string;
  search?: string;
  minPrice?: string;
  maxPrice?: string;
  inStock?: string;
  sort?: "newest" | "price-asc" | "price-desc" | "name-asc";
  attributeKey?: string;
  attributeValue?: string;
};

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: ProductSearchParams;
}) {
  const category = searchParams.category || "";
  const search = searchParams.search || "";
  const minPrice = searchParams.minPrice ? Number(searchParams.minPrice) : undefined;
  const maxPrice = searchParams.maxPrice ? Number(searchParams.maxPrice) : undefined;
  const inStock = searchParams.inStock === "true";
  const sort = searchParams.sort || "newest";
  const attributeKey = searchParams.attributeKey || "";
  const attributeValue = searchParams.attributeValue || "";
  const [categories, products] = await Promise.all([
    getCategories().catch(() => []),
    getProducts({
      category,
      search,
      minPrice: Number.isFinite(minPrice) ? minPrice : undefined,
      maxPrice: Number.isFinite(maxPrice) ? maxPrice : undefined,
      inStock,
      sort,
      attributeKey,
      attributeValue,
    }).catch(() => ({
      items: [],
      page: 1,
      limit: 24,
      total: 0,
      totalPages: 0,
    })),
  ]);

  function categoryHref(nextCategory?: string): string {
    const query = new URLSearchParams();
    if (nextCategory) query.set("category", nextCategory);
    if (search) query.set("search", search);
    if (searchParams.minPrice) query.set("minPrice", searchParams.minPrice);
    if (searchParams.maxPrice) query.set("maxPrice", searchParams.maxPrice);
    if (inStock) query.set("inStock", "true");
    if (sort !== "newest") query.set("sort", sort);
    if (attributeKey) query.set("attributeKey", attributeKey);
    if (attributeValue) query.set("attributeValue", attributeValue);
    return query.size ? `/products?${query.toString()}` : "/products";
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <h1 className="text-[28px] font-semibold tracking-tight text-ink">Shop all</h1>
      <p className="mt-1.5 text-[13px] text-ink2">{products.total} products</p>

      <form className="mt-7 rounded-card border border-line p-5" action="/products">
        {category && <input type="hidden" name="category" value={category} />}
        <div className="grid gap-3 md:grid-cols-[2fr_1fr_1fr_1fr]">
          <label className="text-[11px] uppercase tracking-eyebrow text-ink2">Search<input name="search" defaultValue={search} placeholder="Product, brand, category" className="mt-1.5 w-full rounded-card border border-line px-3.5 py-2.5 text-[13px] normal-case tracking-normal outline-none focus:border-ink" /></label>
          <label className="text-[11px] uppercase tracking-eyebrow text-ink2">Minimum price<input name="minPrice" defaultValue={searchParams.minPrice} type="number" min="0" step="1" placeholder="৳0" className="mt-1.5 w-full rounded-card border border-line px-3.5 py-2.5 text-[13px] normal-case tracking-normal outline-none focus:border-ink" /></label>
          <label className="text-[11px] uppercase tracking-eyebrow text-ink2">Maximum price<input name="maxPrice" defaultValue={searchParams.maxPrice} type="number" min="0" step="1" placeholder="Any" className="mt-1.5 w-full rounded-card border border-line px-3.5 py-2.5 text-[13px] normal-case tracking-normal outline-none focus:border-ink" /></label>
          <label className="text-[11px] uppercase tracking-eyebrow text-ink2">Sort<select name="sort" defaultValue={sort} className="mt-1.5 w-full rounded-card border border-line px-3.5 py-2.5 text-[13px] normal-case tracking-normal outline-none focus:border-ink"><option value="newest">Newest</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option><option value="name-asc">Name</option></select></label>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <label className="text-[11px] uppercase tracking-eyebrow text-ink2">Variant attribute<input name="attributeKey" defaultValue={attributeKey} placeholder="e.g. size" className="mt-1.5 w-full rounded-card border border-line px-3.5 py-2.5 text-[13px] normal-case tracking-normal outline-none focus:border-ink" /></label>
          <label className="text-[11px] uppercase tracking-eyebrow text-ink2">Attribute value<input name="attributeValue" defaultValue={attributeValue} placeholder="e.g. M" className="mt-1.5 w-full rounded-card border border-line px-3.5 py-2.5 text-[13px] normal-case tracking-normal outline-none focus:border-ink" /></label>
          <div className="flex items-end gap-3 pb-0.5"><label className="flex items-center gap-2 whitespace-nowrap text-[13px] text-ink2"><input type="checkbox" name="inStock" value="true" defaultChecked={inStock} /> In stock only</label><button className="rounded-full bg-ink px-5 py-2.5 text-[13px] text-white">Apply</button><Link href="/products" className="text-[12px] text-ink2 underline decoration-line underline-offset-4">Clear</Link></div>
        </div>
      </form>

      <div className="mt-7 flex flex-wrap gap-2 border-b border-line pb-7">
        <Link href={categoryHref()} className={`rounded-full px-4 py-1.5 text-[13px] transition ${!category ? "bg-ink text-white" : "text-ink2 ring-1 ring-line hover:text-ink"}`}>All</Link>
        {categories.map((item) => <Link key={item.id} href={categoryHref(item.slug)} className={`rounded-full px-4 py-1.5 text-[13px] transition ${category === item.slug ? "bg-ink text-white" : "text-ink2 ring-1 ring-line hover:text-ink"}`}>{item.name}</Link>)}
      </div>

      <div className="mt-9 grid grid-cols-2 gap-x-5 gap-y-9 md:grid-cols-3 lg:grid-cols-4">
        {products.items.map((product) => <ProductCard key={product.id} product={product} />)}
      </div>
      {products.items.length === 0 && <div className="py-20 text-center"><p className="text-[15px] text-ink">No matching products</p><p className="mt-2 text-[13px] text-ink2">Clear a filter or try a broader search.</p></div>}
    </main>
  );
}
