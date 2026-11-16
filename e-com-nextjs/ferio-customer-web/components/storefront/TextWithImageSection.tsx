import Link from "next/link";
import Image from "next/image";
import { SectionSettings } from "@/lib/storefront";

interface TextWithImageSectionProps {
  settings: SectionSettings;
  data?: Record<string, unknown>;
}

export default function TextWithImageSection({
  settings,
}: TextWithImageSectionProps) {
  const title = settings.title || "Crafted for durability & authenticity";
  const eyebrow = settings.eyebrow || "OUR COMMITMENT";
  const bodyText =
    settings.bodyText ||
    "Every item in our collection is rigorously inspected for authenticity before reaching your door. We partner directly with authorized distributors to eliminate counterfeits and maintain guaranteed quality.";
  const imageUrl = settings.imageUrl;
  const imagePosition = settings.imagePosition || "right";
  const buttonText = settings.buttonText || settings.ctaText;
  const buttonUrl = settings.buttonUrl || settings.ctaUrl || "/products";
  const showTopBorder = settings.showTopBorder !== false;
  const bgStyle = settings.background || "paper";
  const padding = settings.padding || "normal";

  const bgClass = bgStyle === "surface" ? "bg-surface" : "bg-paper";

  const paddingClass =
    padding === "compact"
      ? "py-10"
      : padding === "spacious"
        ? "py-24"
        : "py-16";

  const isImageLeft = imagePosition === "left";

  return (
    <section
      className={`w-full ${bgClass} ${
        showTopBorder ? "border-t border-line" : ""
      }`}
    >
      <div className={`mx-auto max-w-6xl px-6 ${paddingClass}`}>
        <div className="grid grid-cols-1 items-center gap-12 md:grid-cols-2">
          <div className={isImageLeft ? "order-2 md:order-2" : "order-1"}>
            {eyebrow && (
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-ink2 mb-2">
                {eyebrow}
              </span>
            )}
            <h2 className="text-[28px] sm:text-[34px] font-semibold tracking-tight leading-tight text-ink">
              {title}
            </h2>
            {settings.subtitle && (
              <p className="mt-2 text-[15px] font-medium text-ink/80">
                {settings.subtitle}
              </p>
            )}
            <p className="mt-4 text-[14px] leading-relaxed text-ink2">
              {bodyText}
            </p>
            {buttonText && (
              <div className="mt-7">
                <Link
                  href={buttonUrl}
                  className="inline-flex rounded-full bg-ink px-6 py-2.5 text-[13px] font-medium text-white transition hover:opacity-85"
                >
                  {buttonText}
                </Link>
              </div>
            )}
          </div>

          <div
            className={`relative aspect-[4/3] w-full overflow-hidden rounded-card border border-line bg-surface/50 ${
              isImageLeft ? "order-1 md:order-1" : "order-2"
            }`}
          >
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={title}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[12px] text-ink2">
                Story Image Placeholder
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

