import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import { CatalogProduct } from "@/lib/catalog";
import { SectionSettings } from "@/lib/storefront";

interface ProductCarouselSectionProps {
  settings: SectionSettings;
  data?: {
    items?: CatalogProduct[];
  };
}

export default function ProductCarouselSection({
  settings,
  data,
}: ProductCarouselSectionProps) {
  const items = data?.items || [];
  const title = settings.title || "Curated collection";
  const eyebrow = settings.eyebrow;
  const showViewAll = settings.showViewAll !== false;
  const viewAllUrl = settings.viewAllUrl || "/products";
  const viewAllText = settings.viewAllText || "View all →";
  const showTopBorder = settings.showTopBorder !== false;
  const bgStyle = settings.background || "paper";
  const padding = settings.padding || "normal";

  if (items.length === 0 && settings.hideWhenEmpty) {
    return null;
  }

  const bgClass = bgStyle === "surface" ? "bg-surface" : "bg-paper";

  const paddingClass =
    padding === "compact"
      ? "py-8"
      : padding === "spacious"
        ? "py-20"
        : "py-12";

  return (
    <section
      className={`w-full ${bgClass} ${
        showTopBorder ? "border-t border-line" : ""
      }`}
    >
      <div className={`mx-auto max-w-6xl px-6 ${paddingClass}`}>
        <div className="flex items-baseline justify-between">
          <div>
            {eyebrow && (
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-ink2 mb-1">
                {eyebrow}
              </span>
            )}
            <h2 className="text-[22px] font-semibold tracking-tight text-ink">
              {title}
            </h2>
            {settings.subtitle && (
              <p className="mt-1 text-[13px] text-ink2">{settings.subtitle}</p>
            )}
          </div>
          {showViewAll && (
            <Link
              href={viewAllUrl}
              className="text-[13px] text-ink2 transition hover:text-ink"
            >
              {viewAllText}
            </Link>
          )}
        </div>

        <div className="mt-7 flex gap-5 overflow-x-auto pb-4 pt-1 scrollbar-none [scrollbar-width:none]">
          {items.map((product) => (
            <div key={product.id} className="w-[240px] flex-shrink-0">
              <ProductCard product={product} />
            </div>
          ))}
        </div>

        {items.length === 0 && (
          <p className="mt-7 text-center text-[13px] text-ink2">
            No products found for this section.
          </p>
        )}
      </div>
    </section>
  );
}
