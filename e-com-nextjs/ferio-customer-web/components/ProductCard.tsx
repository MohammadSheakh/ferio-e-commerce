import Link from "next/link";
import { CatalogProduct, formatTaka } from "@/lib/catalog";

export default function ProductCard({ product }: { product: CatalogProduct }) {
  const outOfStock = product.availableStock === 0;
  const discount = product.compareAtPrice
    ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
    : null;

  return (
    <Link href={`/products/${product.slug}`} className="group block">
      <div className="relative aspect-[4/5] overflow-hidden rounded-card bg-surface">
        {product.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image}
            alt={product.name}
            className={`h-full w-full object-cover transition duration-500 group-hover:scale-[1.03] ${outOfStock ? "opacity-50 grayscale" : ""}`}
          />
        ) : (
          <div className="flex h-full items-center justify-center px-6 text-center text-[12px] text-ink2">
            Product image coming soon
          </div>
        )}
        {discount && !outOfStock && (
          <span className="absolute left-3 top-3 rounded-full bg-ink px-2.5 py-1 text-[11px] font-medium text-white">
            −{discount}%
          </span>
        )}
        {outOfStock && (
          <span className="absolute left-3 top-3 rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-ink2 ring-1 ring-line">
            Out of stock
          </span>
        )}
        {product.condition === "SECOND_HAND" && !outOfStock && (
          <span className="absolute bottom-3 left-3 rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-ink ring-1 ring-line">
            Second-hand
          </span>
        )}
      </div>
      <div className="mt-3">
        <p className="text-[13px] text-ink2">{product.category.name}</p>
        <h3 className="mt-0.5 text-[14px] font-medium text-ink">{product.name}</h3>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-[14px] font-semibold text-ink">
            {formatTaka(product.price)}
          </span>
          {product.compareAtPrice && (
            <span className="text-[13px] text-ink2 line-through">
              {formatTaka(product.compareAtPrice)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
