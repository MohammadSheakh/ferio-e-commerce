import Link from "next/link";
import FlashSaleCard from "@/components/FlashSaleCard";
import { CatalogProduct } from "@/lib/catalog";
import { SectionSettings } from "@/lib/storefront";

interface FlashSaleSectionProps {
  settings: SectionSettings;
  data?: {
    items?: CatalogProduct[];
  };
}

export default function FlashSaleSection({
  settings,
  data,
}: FlashSaleSectionProps) {
  const items = data?.items || [];
  const title = settings.title || "Flash sale";
  const eyebrow = settings.eyebrow;
  const promoBadge = settings.promoBadge || "FLASH DEAL";
  const discountHighlight = settings.discountHighlight;
  const showViewAll = settings.showViewAll !== false;
  const viewAllUrl = settings.viewAllUrl || "/products?sale=true";
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
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-block rounded-full bg-ink px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                {promoBadge}
              </span>
              {eyebrow && (
                <span className="text-[11px] font-semibold uppercase tracking-wider text-ink2">
                  {eyebrow}
                </span>
              )}
            </div>
            <h2 className="text-[22px] font-semibold tracking-tight text-ink">
              {title}
            </h2>
            {(settings.subtitle || discountHighlight) && (
              <p className="mt-1 text-[13px] text-ink2">
                {discountHighlight ? (
                  <span className="font-medium text-ink mr-2">
                    {discountHighlight}
                  </span>
                ) : null}
                {settings.subtitle}
              </p>
            )}
          </div>
          {showViewAll && (
            <Link
              href={viewAllUrl}
              className="text-[13px] text-ink2 transition hover:text-ink shrink-0"
            >
              {viewAllText}
            </Link>
          )}
        </div>

        <div className="mt-7 grid grid-cols-2 gap-x-5 gap-y-9 md:grid-cols-4">
          {items.map((product, idx) => (
            <FlashSaleCard
              key={`flash-${product.id}`}
              product={product}
              initialDays={10 + idx * 2}
              initialHours={4 + idx * 3}
              initialMinutes={20 + idx * 5}
            />
          ))}
        </div>

        {items.length === 0 && (
          <p className="mt-7 text-center text-[13px] text-ink2">
            No active flash sale products right now.
          </p>
        )}
      </div>
    </section>
  );
}
