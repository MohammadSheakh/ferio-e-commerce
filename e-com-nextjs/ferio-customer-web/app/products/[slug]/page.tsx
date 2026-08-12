import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { formatTaka, getProduct } from "@/lib/catalog";
import AddToCart from "./AddToCart";

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

  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <div className="grid gap-16 md:grid-cols-2">
        <div>
          <div className="aspect-[4/5] overflow-hidden rounded-card bg-surface">{product.image ? <img src={product.image} alt={product.name} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-[13px] text-ink2">Product image coming soon</div>}</div>
          {product.images.length > 1 && <div className="mt-3 grid grid-cols-4 gap-3">{product.images.slice(1, 5).map((image, index) => <div key={image} className="aspect-square overflow-hidden rounded-card bg-surface"><img src={image} alt={`${product.name} view ${index + 2}`} className="h-full w-full object-cover" /></div>)}</div>}
        </div>
        <div className="md:pt-2">
          <p className="text-[13px] text-ink2">{product.category.name}</p>
          <h1 className="mt-1.5 text-[26px] font-semibold tracking-tight text-ink">{product.name}</h1>
          {product.brand && <p className="mt-2 text-[13px] text-ink2">By {product.brand}</p>}
          <div className="mt-5 flex items-baseline gap-3">
            <span className="text-[22px] font-semibold text-ink">{formatTaka(product.price)}</span>
            {product.compareAtPrice && <span className="text-[15px] text-ink2 line-through">{formatTaka(product.compareAtPrice)}</span>}
          </div>
          <p className="mt-6 text-[14px] leading-relaxed text-ink2">{product.description}</p>
          <div className="mt-7 space-y-2.5 border-t border-line pt-6 text-[13px] text-ink/80">
            <p>{product.codAvailable ? "Cash on delivery available" : "Prepaid only"}</p>
            {product.deliveryNote && <p>{product.deliveryNote}</p>}
            {product.returnNote && <p>{product.returnNote}</p>}
            <p><Link href="/policies#returns" className="underline decoration-line underline-offset-4 hover:text-ink">View return terms</Link></p>
            <p>{product.availableStock > 0 ? `${product.availableStock} available` : "Currently out of stock"}</p>
          </div>
          <AddToCart product={product} />
        </div>
      </div>
    </main>
  );
}
