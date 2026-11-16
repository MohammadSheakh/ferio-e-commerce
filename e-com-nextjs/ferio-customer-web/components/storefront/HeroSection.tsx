import Link from "next/link";
import Image from "next/image";
import { SectionSettings } from "@/lib/storefront";
import InteractiveHeroShowcaseV2 from "@/components/InteractiveHeroShowcaseV2";

interface HeroSectionProps {
  settings: SectionSettings;
  data?: Record<string, unknown>;
}

export default function HeroSection({ settings }: HeroSectionProps) {
  // If the signature interactive showcase variant is chosen, render the full multi-card experience
  if (settings.layout === "interactive" || settings.variant === "interactive" || settings.showcaseType === "interactive") {
    return <InteractiveHeroShowcaseV2 />;
  }

  const title = settings.title || "From our shelf to your doorstep.";
  const subtitle =
    settings.subtitle ||
    "Handpicked products nationwide Bangladesh.";
  const eyebrow = settings.eyebrow;
  const ctaText = settings.ctaText || "Shop collection";
  const ctaUrl = settings.ctaUrl || "/products";
  const secondaryCtaText = settings.secondaryCtaText;
  const secondaryCtaUrl = settings.secondaryCtaUrl || "/products";
  const imageUrl = settings.imageUrl;
  const layout = settings.layout || (imageUrl ? "split" : "centered");
  const bgStyle = settings.background || "surface";
  const padding = settings.padding || "normal";
  const showTopBorder = Boolean(settings.showTopBorder);

  // Background classes adhering strictly to ferio-design grayscale
  const bgClass =
    bgStyle === "ink"
      ? "bg-[#111114] text-white"
      : bgStyle === "paper"
        ? "bg-paper text-ink"
        : "bg-surface text-ink";

  const paddingClass =
    padding === "compact"
      ? "py-10 md:py-12"
      : padding === "spacious"
        ? "py-20 md:py-28"
        : "py-14 md:py-20";

  const isInk = bgStyle === "ink";

  return (
    <section
      className={`relative w-full ${bgClass} ${
        showTopBorder ? "border-t border-line" : ""
      }`}
    >
      <div className={`mx-auto max-w-6xl px-6 ${paddingClass}`}>
        {layout === "split" && imageUrl ? (
          <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-2">
            <div>
              {eyebrow && (
                <span
                  className={`inline-block rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider mb-3 ${
                    isInk
                      ? "bg-white/10 text-white/90 border border-white/20"
                      : "bg-paper text-ink2 border border-line"
                  }`}
                >
                  {eyebrow}
                </span>
              )}
              <h1 className="text-[32px] sm:text-[40px] font-semibold tracking-tight leading-[1.15]">
                {title}
              </h1>
              {subtitle && (
                <p
                  className={`mt-4 text-[15px] sm:text-[16px] leading-relaxed max-w-xl ${
                    isInk ? "text-white/70" : "text-ink2"
                  }`}
                >
                  {subtitle}
                </p>
              )}
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href={ctaUrl}
                  className={`inline-flex items-center justify-center rounded-full px-6 py-3 text-[13px] font-medium transition ${
                    isInk
                      ? "bg-white text-ink hover:bg-white/90"
                      : "bg-ink text-white hover:opacity-85"
                  }`}
                >
                  {ctaText}
                </Link>
                {secondaryCtaText && (
                  <Link
                    href={secondaryCtaUrl}
                    className={`inline-flex items-center justify-center rounded-full border px-6 py-3 text-[13px] font-medium transition ${
                      isInk
                        ? "border-white/30 text-white hover:bg-white/10"
                        : "border-line bg-paper text-ink hover:bg-surface"
                    }`}
                  >
                    {secondaryCtaText}
                  </Link>
                )}
              </div>
            </div>

            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-card border border-line bg-surface/50">
              <Image
                src={imageUrl}
                alt={title}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
                priority
              />
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl text-center flex flex-col items-center">
            {eyebrow && (
              <span
                className={`inline-block rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider mb-4 ${
                  isInk
                    ? "bg-white/10 text-white/90 border border-white/20"
                    : "bg-paper text-ink2 border border-line"
                }`}
              >
                {eyebrow}
              </span>
            )}
            <h1 className="text-[34px] sm:text-[48px] font-semibold tracking-tight leading-[1.12]">
              {title}
            </h1>
            {subtitle && (
              <p
                className={`mt-4 text-[15px] sm:text-[17px] leading-relaxed max-w-xl ${
                  isInk ? "text-white/70" : "text-ink2"
                }`}
              >
                {subtitle}
              </p>
            )}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href={ctaUrl}
                className={`inline-flex items-center justify-center rounded-full px-6 py-3 text-[13px] font-medium transition ${
                  isInk
                    ? "bg-white text-ink hover:bg-white/90"
                    : "bg-ink text-white hover:opacity-85"
                }`}
              >
                {ctaText}
              </Link>
              {secondaryCtaText && (
                <Link
                  href={secondaryCtaUrl}
                  className={`inline-flex items-center justify-center rounded-full border px-6 py-3 text-[13px] font-medium transition ${
                    isInk
                      ? "border-white/30 text-white hover:bg-white/10"
                      : "border-line bg-paper text-ink hover:bg-surface"
                  }`}
                >
                  {secondaryCtaText}
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
