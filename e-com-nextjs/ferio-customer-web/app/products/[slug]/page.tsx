import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { formatTaka, getProduct } from "@/lib/catalog";
import AddToCart from "./AddToCart";
import ReviewSection from "./ReviewSection";
import ProductFeaturesSection from "./ProductFeaturesSection";
import CustomerReviewsSection from "./CustomerReviewsSection";
import ProductQASection from "./ProductQASection";
import RelatedProductsSection from "./RelatedProductsSection";
import ProductImageGallery from "./ProductImageGallery";
import ProductSubNavTabs from "./ProductSubNavTabs";
import { getPublicApi } from "@/lib/backend";

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

  const content = await getPublicApi<Parameters<typeof ReviewSection>[0]["content"]>(
    `/product-content/${params.slug}`,
    { cache: "no-store" }
  ).catch(() => null);

  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      {/* Product Primary Information Section */}
      <div className="grid gap-16 md:grid-cols-2">
        <ProductImageGallery
          mainImage={product.image}
          images={product.images}
          productName={product.name}
        />

        <div className="md:pt-2">
          <p className="text-[13px] text-ink2">{product.category.name}</p>
          <h1 className="mt-1.5 text-[26px] font-semibold tracking-tight text-ink">
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
            className="mt-6 text-[14px] leading-relaxed text-ink2 prose prose-sm max-w-none [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_blockquote]:border-l-4 [&_blockquote]:border-line [&_blockquote]:pl-3 [&_blockquote]:italic [&_h2]:text-base [&_h2]:font-bold [&_h3]:text-sm [&_h3]:font-semibold [&_p]:mb-2.5"
            dangerouslySetInnerHTML={{ __html: product.description }}
          />

          <div className="mt-7 space-y-2.5 border-t border-line pt-6 text-[13px] text-ink/80">
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

      {/* 1. Feature Showcase Section */}
      <ProductFeaturesSection features={product.features} />

      {/* 2. Product Sub Navbar Tabs with wrapped sections for continuous sticky navigation */}
      <ProductSubNavTabs product={product}>
        {/* YouTube Video Reviews */}
        <div id="youtube-reviews-section" className="scroll-mt-32">
          <ReviewSection productId={product.id} content={content} />
        </div>

        {/* Customer Reviews Section */}
        <div id="reviews-section" className="scroll-mt-32">
          <CustomerReviewsSection productId={product.id} />
        </div>

        {/* Ask Question / Q&A Section */}
        <div id="questions-section" className="scroll-mt-32">
          <ProductQASection productId={product.id} />
        </div>

        {/* Related Products Carousel Section */}
        <RelatedProductsSection categorySlug={product.category?.slug} />
      </ProductSubNavTabs>
    </main>
  );
}
