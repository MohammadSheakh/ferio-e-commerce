import Link from "next/link";
import { CatalogCategory } from "@/lib/catalog";
import { SectionSettings } from "@/lib/storefront";

interface CategoryGridSectionProps {
  settings: SectionSettings;
  data?: {
    categories?: CatalogCategory[];
  };
}

export default function CategoryGridSection({
  settings,
  data,
}: CategoryGridSectionProps) {
  const categories = data?.categories || [];
  const title = settings.title || "Shop by category";
  const eyebrow = settings.eyebrow;
  const showViewAll = settings.showViewAll !== false;
  const viewAllUrl = settings.viewAllUrl || "/products";
  const viewAllText = settings.viewAllText || "View all →";
  const columns = settings.columns || 5;
  const layoutStyle = settings.layoutStyle || "tiles";
  const showTopBorder = settings.showTopBorder !== false;
  const bgStyle = settings.background || "paper";
  const padding = settings.padding || "normal";

  if (categories.length === 0 && settings.hideWhenEmpty) {
    return null;
  }

  const bgClass = bgStyle === "surface" ? "bg-surface" : "bg-paper";

  const paddingClass =
    padding === "compact"
      ? "py-8"
      : padding === "spacious"
        ? "py-20"
        : "py-14";

  const gridColsClass =
    columns === 8
      ? "grid-cols-2 sm:grid-cols-4 md:grid-cols-8"
      : columns === 6
        ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-6"
        : columns === 4
          ? "grid-cols-2 sm:grid-cols-2 md:grid-cols-4"
          : columns === 3
            ? "grid-cols-1 sm:grid-cols-3"
            : "grid-cols-2 sm:grid-cols-3 md:grid-cols-5";

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

        {layoutStyle === "pills" ? (
          <div className="mt-6 flex flex-wrap gap-2.5">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/products?category=${category.slug}`}
                className="inline-flex items-center rounded-full border border-line bg-paper px-4 py-2 text-[13px] font-medium text-ink transition hover:border-ink hover:bg-surface"
              >
                {category.name}
              </Link>
            ))}
          </div>
        ) : (
          <div className={`mt-7 grid gap-3 ${gridColsClass}`}>
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/products?category=${category.slug}`}
                className="rounded-card border border-line bg-surface/40 px-4 py-6 text-center text-[13px] font-medium text-ink transition hover:border-ink/40 hover:bg-surface"
              >
                {category.name}
              </Link>
            ))}
          </div>
        )}

        {categories.length === 0 && (
          <p className="mt-7 text-center text-[13px] text-ink2">
            Categories will appear after the catalog is published.
          </p>
        )}
      </div>
    </section>
  );
}
