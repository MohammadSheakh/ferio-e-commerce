import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import { CatalogProduct } from "@/lib/catalog";
import { SectionSettings } from "@/lib/storefront";

interface ProductGridSectionProps {
  settings: SectionSettings;
  data?: {
    items?: CatalogProduct[];
  };
}

export default function ProductGridSection({
  settings,
  data,
}: ProductGridSectionProps) {
  const items = data?.items || [];
  const title = settings.title || "Featured products";
  const eyebrow = settings.eyebrow;
  const showViewAll = settings.showViewAll !== false;
  const viewAllUrl = settings.viewAllUrl || "/products";
  const viewAllText = settings.viewAllText || "View all →";
  const columns = settings.columns || 4;
  const showTopBorder = settings.showTopBorder !== false;
  const bgStyle = settings.background || "paper";
  const padding = settings.padding || "normal";
  const isCentered = settings.alignment === "center";

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

  const gridColsClass =
    columns === 6
      ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-6"
      : columns === 5
        ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-5"
        : columns === 3
          ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3"
          : columns === 2
            ? "grid-cols-1 sm:grid-cols-2"
            : "grid-cols-2 gap-x-5 gap-y-9 md:grid-cols-4";

  return (
    <section
      className={`w-full ${bgClass} ${
        showTopBorder ? "border-t border-line" : ""
      }`}
    >
      <div className={`mx-auto max-w-6xl px-6 ${paddingClass}`}>
        <div
          className={`flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 ${
            isCentered ? "text-center sm:text-center justify-center" : ""
          }`}
        >
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
          {showViewAll && !isCentered && (
            <Link
              href={viewAllUrl}
              className="text-[13px] text-ink2 transition hover:text-ink shrink-0"
            >
              {viewAllText}
            </Link>
          )}
        </div>

        <div className={`mt-7 grid gap-x-5 gap-y-9 ${gridColsClass}`}>
          {items.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {items.length === 0 && (
          <p className="mt-7 text-center text-[13px] text-ink2">
            No products found for this section.
          </p>
        )}

        {showViewAll && isCentered && (
          <div className="mt-10 text-center">
            <Link
              href={viewAllUrl}
              className="inline-flex rounded-full border border-line bg-paper px-6 py-2.5 text-[12px] font-medium text-ink transition hover:bg-surface"
            >
              {viewAllText}
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
