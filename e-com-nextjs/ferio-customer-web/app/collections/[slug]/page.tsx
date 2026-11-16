import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getStorefrontCollection } from "@/lib/storefront";
import ProductCard from "@/components/ProductCard";

interface CollectionPageProps {
  params: {
    slug: string;
  };
  searchParams?: {
    sort?: string;
  };
}

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: CollectionPageProps): Promise<Metadata> {
  const collection = await getStorefrontCollection(params.slug);
  if (!collection) {
    return { title: "Collection Not Found" };
  }

  const title = collection.seoTitle || `${collection.name} — Collection`;
  const description =
    collection.seoDescription ||
    collection.description ||
    `Browse curated products from the ${collection.name} collection.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: collection.bannerImageUrl ? [{ url: collection.bannerImageUrl }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function CollectionPage({
  params,
  searchParams,
}: CollectionPageProps) {
  const collection = await getStorefrontCollection(params.slug);
  if (!collection) {
    notFound();
  }

  const sort = searchParams?.sort || "newest";
  let sortedProducts = [...(collection.products || [])];

  if (sort === "price-asc") {
    sortedProducts.sort((a, b) => (a.price || 0) - (b.price || 0));
  } else if (sort === "price-desc") {
    sortedProducts.sort((a, b) => (b.price || 0) - (a.price || 0));
  }

  return (
    <main className="min-h-screen bg-paper pb-24">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mx-auto max-w-6xl px-6 pt-6">
        <ol className="flex items-center gap-2 text-[12px] text-ink2">
          <li>
            <Link href="/" className="transition hover:text-ink">
              Home
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href="/products" className="transition hover:text-ink">
              Catalog
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="font-medium text-ink">
            {collection.name}
          </li>
        </ol>
      </nav>

      {/* Collection Hero Header */}
      <header className="mx-auto max-w-6xl px-6 pt-8 pb-10">
        <div className="rounded-card border border-line bg-surface/40 p-8 md:p-12">
          {collection.bannerImageUrl && (
            <div className="relative mb-6 aspect-[21/9] w-full overflow-hidden rounded-lg border border-line bg-surface">
              <Image
                src={collection.bannerImageUrl}
                alt={collection.name}
                fill
                priority
                className="object-cover"
              />
            </div>
          )}

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <span className="inline-block rounded-full bg-paper px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-ink2 border border-line mb-3">
                Curated Collection
              </span>
              <h1 className="text-[32px] sm:text-[40px] font-semibold tracking-tight text-ink">
                {collection.name}
              </h1>
              {collection.description && (
                <p className="mt-2 text-[14px] sm:text-[15px] leading-relaxed text-ink2 max-w-2xl">
                  {collection.description}
                </p>
              )}
            </div>

            <div className="text-right">
              <span className="rounded-full bg-paper px-4 py-1.5 text-[12px] font-medium text-ink border border-line">
                {sortedProducts.length} {sortedProducts.length === 1 ? "Product" : "Products"}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Products Grid & Sorting */}
      <section className="mx-auto max-w-6xl px-6">
        <div className="flex items-center justify-between border-b border-line pb-4 mb-8">
          <span className="text-[13px] font-medium text-ink2">
            Showing all items
          </span>

          <div className="flex items-center gap-2">
            <span className="text-[12px] text-ink2">Sort by:</span>
            <div className="flex items-center gap-1">
              <Link
                href={`/collections/${collection.slug}?sort=newest`}
                className={`rounded-full px-3 py-1 text-[11px] font-medium transition ${
                  sort === "newest"
                    ? "bg-ink text-white"
                    : "border border-line bg-paper text-ink hover:bg-surface"
                }`}
              >
                Newest
              </Link>
              <Link
                href={`/collections/${collection.slug}?sort=price-asc`}
                className={`rounded-full px-3 py-1 text-[11px] font-medium transition ${
                  sort === "price-asc"
                    ? "bg-ink text-white"
                    : "border border-line bg-paper text-ink hover:bg-surface"
                }`}
              >
                Price: Low to High
              </Link>
              <Link
                href={`/collections/${collection.slug}?sort=price-desc`}
                className={`rounded-full px-3 py-1 text-[11px] font-medium transition ${
                  sort === "price-desc"
                    ? "bg-ink text-white"
                    : "border border-line bg-paper text-ink hover:bg-surface"
                }`}
              >
                Price: High to Low
              </Link>
            </div>
          </div>
        </div>

        {sortedProducts.length > 0 ? (
          <div className="grid grid-cols-2 gap-x-5 gap-y-9 sm:grid-cols-3 md:grid-cols-4">
            {sortedProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="py-20 text-center">
            <h3 className="text-[16px] font-medium text-ink">
              No products found in this collection
            </h3>
            <p className="mt-1 text-[13px] text-ink2">
              Products will automatically appear once published and catalog rules match.
            </p>
            <div className="mt-6">
              <Link
                href="/products"
                className="inline-flex rounded-full bg-ink px-6 py-2.5 text-[12px] font-medium text-white transition hover:opacity-85"
              >
                Browse all products
              </Link>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

