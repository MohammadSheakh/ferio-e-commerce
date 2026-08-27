import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { formatTaka, getProduct } from "@/lib/catalog";
import AddToCart from "./AddToCart";
import ReviewSection from "./ReviewSection";
import ProductFeaturesSection from "./ProductFeaturesSection";
import RelatedProductsSection from "./RelatedProductsSection";
import ProductImageGallery from "./ProductImageGallery";
import ProductSubNavTabs from "./ProductSubNavTabs";
import { getPublicApi } from "@/lib/backend";
import ProductViewAnalytics from "./ProductViewAnalytics";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const product = await getProduct(params.slug).catch(() => null);
  if (!product) return { title: "Product not found | Ferio" };
  return {
    title: product.seoTitle || `${product.name} | Ferio`,
    description: product.seoDescription || product.description.slice(0, 160),
    openGraph: {
      title: product.seoTitle || product.name,
      description: product.seoDescription || product.description.slice(0, 160),
      images: product.images,
      type: "website",
    },
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const product = await getProduct(params.slug).catch(() => null);
  if (!product) notFound();

  const content = await getPublicApi<
    Parameters<typeof ReviewSection>[0]["content"]
  >(`/product-content/${params.slug}`, { cache: "no-store" }).catch(() => null);

  return (
    <main className="min-h-screen bg-paper">
      <ProductViewAnalytics productId={product.id} />
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <nav aria-label="Breadcrumb" className="mb-7 flex text-xs text-ink2">
          <Link href="/" className="hover:text-ink">
            Home
          </Link>
          <span className="mx-2">/</span>
          <Link
            href={`/products?category=${product.category.slug}`}
            className="hover:text-ink"
          >
            {product.category.name}
          </Link>
          <span className="mx-2">/</span>
          <span className="truncate font-medium text-ink">{product.name}</span>
        </nav>

        <div className="grid gap-10 md:grid-cols-2 lg:gap-16">
          <ProductImageGallery
            mainImage={product.image}
            images={product.images}
            productName={product.name}
          />

          <div className="md:pt-2">
            <p className="text-[11px] uppercase tracking-eyebrow text-ink2">
              {product.category.name}
            </p>
            <h1 className="mt-2 text-[26px] font-semibold tracking-tight text-ink">
              {product.name}
            </h1>
            {product.brand && (
              <p className="mt-2 text-[13px] text-ink2">By {product.brand}</p>
            )}

            {product.condition === "SECOND_HAND" && (
              <div className="mt-5 rounded-card border border-line p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[13px] font-medium text-ink">
                    Second-hand product
                  </p>
                  <span className="rounded-full bg-surface px-2.5 py-1 text-[11px] text-ink2">
                    {product.conditionGrade?.replaceAll("_", " ").toLowerCase()}
                  </span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-[12px] leading-5 text-ink2">
                  {product.conditionNote}
                </p>
              </div>
            )}

            <div className="mt-5 flex items-baseline gap-3">
              <span className="text-[22px] font-semibold text-ink">
                {formatTaka(product.price)}
              </span>
              {product.compareAtPrice && (
                <span className="text-[15px] text-ink2 line-through">
                  {formatTaka(product.compareAtPrice)}
                </span>
              )}
            </div>

            <div
              className="prose prose-sm mt-6 max-w-none text-[14px] leading-relaxed text-ink2 [&_blockquote]:border-l-2 [&_blockquote]:border-line [&_blockquote]:pl-3 [&_blockquote]:italic [&_h2]:text-base [&_h2]:font-semibold [&_h3]:text-sm [&_h3]:font-semibold [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2.5 [&_ul]:list-disc [&_ul]:pl-5"
              dangerouslySetInnerHTML={{ __html: product.description }}
            />

            <div className="mt-7 space-y-2.5 border-y border-line py-5 text-[13px] text-ink/80">
              <p>
                {product.codAvailable
                  ? "Cash on delivery available"
                  : "Prepaid only"}
              </p>
              {product.deliveryNote && <p>{product.deliveryNote}</p>}
              {product.returnNote && <p>{product.returnNote}</p>}
              <p>
                <Link
                  href="/policies#returns"
                  className="underline decoration-line underline-offset-4 hover:text-ink"
                >
                  View return terms
                </Link>
              </p>
              <p>
                {product.availableStock > 0
                  ? `${product.availableStock} available`
                  : "Currently out of stock"}
              </p>
            </div>

            <AddToCart product={product} />
          </div>
        </div>

        <ProductFeaturesSection features={product.features} />

        <ProductSubNavTabs product={product}>
          <div id="youtube-reviews-section" className="scroll-mt-32">
            <ReviewSection productId={product.id} content={content} />
          </div>

          <RelatedProductsSection categorySlug={product.category?.slug} />
        </ProductSubNavTabs>
      </div>
    </main>
  );
}
