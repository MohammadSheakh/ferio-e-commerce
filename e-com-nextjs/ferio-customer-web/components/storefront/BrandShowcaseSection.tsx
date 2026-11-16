import Link from "next/link";
import { SectionSettings } from "@/lib/storefront";

interface BrandShowcaseSectionProps {
  settings: SectionSettings;
  data?: Record<string, unknown>;
}

export default function BrandShowcaseSection({
  settings,
}: BrandShowcaseSectionProps) {
  const title = settings.title || "Authorized Brands";
  const eyebrow = settings.eyebrow || "GENUINE PARTNERS";
  const columns = settings.columns || 6;
  const showTopBorder = settings.showTopBorder !== false;
  const bgStyle = settings.background || "paper";
  const padding = settings.padding || "normal";

  // Parse comma-separated brand names or use defaults
  const brandList = settings.brandNames
    ? settings.brandNames.split(",").map((s) => s.trim()).filter(Boolean)
    : ["Apple", "Samsung", "Sony", "Anker", "Baseus", "Xiaomi"];

  const bgClass = bgStyle === "surface" ? "bg-surface" : "bg-paper";

  const paddingClass =
    padding === "compact"
      ? "py-8"
      : padding === "spacious"
        ? "py-20"
        : "py-12";

  const gridColsClass =
    columns === 8
      ? "grid-cols-2 sm:grid-cols-4 md:grid-cols-8"
      : columns === 4
        ? "grid-cols-2 sm:grid-cols-4"
        : "grid-cols-2 sm:grid-cols-3 md:grid-cols-6";

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
        </div>

        <div className={`mt-7 grid gap-3 ${gridColsClass}`}>
          {brandList.map((brand) => (
            <Link
              key={brand}
              href={`/products?search=${encodeURIComponent(brand)}`}
              className="flex items-center justify-center rounded-card border border-line bg-surface/30 px-4 py-5 text-center text-[13px] font-semibold text-ink transition hover:border-ink/40 hover:bg-surface"
            >
              {brand}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

