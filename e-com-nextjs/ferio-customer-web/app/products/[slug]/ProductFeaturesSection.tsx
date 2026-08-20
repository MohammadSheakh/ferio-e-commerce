"use client";

import { useState } from "react";
import Image from "next/image";
import type { CatalogFeature } from "@/lib/catalog";

interface ProductFeaturesSectionProps {
  features?: CatalogFeature[];
}

const DEFAULT_FEATURES: CatalogFeature[] = [
  {
    id: "feat-1",
    title: "Easy to clean the velour",
    description:
      "Mud-repeat technology Clean Comfort. Most types of contaminants are easily removed with a soft sponge and ordinary water. Vellure 'Trinity' has a particularly delicate and velvety structure. The fabric 'Antique' is resistant to the claws of pets. High wear resistance, more than 50 thousand cycles on the Martindale test.",
    image:
      "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80",
    tag: "Velour Fabric",
  },
  {
    id: "feat-2",
    title: "Scandinavian minimalist design",
    description:
      "Clean geometric silhouette, organic natural wood textures, and refined proportions that blend harmoniously with any contemporary living room or home office environment.",
    image:
      "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=800&q=80",
    tag: "Scandinavian design",
  },
  {
    id: "feat-3",
    title: "Integrated storage & lingerie box",
    description:
      "Spacious internal compartment engineered with smooth pneumatic gas lift mechanisms for effortless access to blankets, pillows, and extra seasonal items.",
    image:
      "https://images.unsplash.com/photo-1538688525198-9b88f6f53126?auto=format&fit=crop&w=800&q=80",
    tag: "Lingerie box",
  },
  {
    id: "feat-4",
    title: "Heavy-duty reinforced alloy frame",
    description:
      "Built with precision-laser cut steel components and kiln-dried solid hardwood base, certified to withstand up to 350kg of total weight load without flexing.",
    image:
      "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=800&q=80",
    tag: "Alloy Frame",
  },
];

export default function ProductFeaturesSection({
  features,
}: ProductFeaturesSectionProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  // If features prop is explicitly passed as an array:
  // If empty array, hide section. If undefined, fallback to DEFAULT_FEATURES.
  const featureList =
    features !== undefined
      ? features
      : DEFAULT_FEATURES;

  if (!featureList || featureList.length === 0) {
    return null;
  }

  const safeIndex = activeIndex % featureList.length;
  const currentFeature = featureList[safeIndex];

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % featureList.length);
  };

  const handlePrev = () => {
    setActiveIndex(
      (prev) => (prev - 1 + featureList.length) % featureList.length
    );
  };

  return (
    <section className="mt-16 border-t border-line pt-12">
      <div className="rounded-card border border-line bg-paper p-6 md:p-10 shadow-sm">
        <h2 className="text-[13px] font-bold uppercase tracking-eyebrow text-ink mb-8">
          FEATURES
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Main Feature Image */}
          <div className="lg:col-span-5 relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-line bg-surface flex items-center justify-center">
            {currentFeature.image ? (
              <Image
                src={currentFeature.image}
                alt={currentFeature.title}
                fill
                className="object-cover transition-transform duration-700 hover:scale-105"
                sizes="(max-width: 1024px) 100vw, 40vw"
              />
            ) : (
              <div className="p-6 text-center text-ink2 text-sm font-medium">
                {currentFeature.tag || currentFeature.title}
              </div>
            )}
          </div>

          {/* Feature Details & Controls */}
          <div className="lg:col-span-4 flex flex-col justify-between h-full space-y-6">
            <div>
              {/* Index Indicator */}
              <div className="flex items-baseline gap-1 text-ink">
                <span className="text-3xl font-black">
                  {String(safeIndex + 1).padStart(2, "0")}
                </span>
                <span className="text-sm font-semibold text-ink2">
                  /{String(featureList.length).padStart(2, "0")}
                </span>
              </div>

              {/* Title & Description */}
              <h3 className="mt-4 text-xl font-bold tracking-tight text-ink leading-snug">
                {currentFeature.title}
              </h3>
              <p className="mt-3 text-xs leading-relaxed text-ink2">
                {currentFeature.description}
              </p>
            </div>

            {/* Navigation Controls */}
            {featureList.length > 1 && (
              <div className="flex items-center gap-4 pt-2">
                <button
                  onClick={handlePrev}
                  aria-label="Previous feature"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white text-ink transition hover:bg-ink hover:text-white shadow-sm"
                >
                  ←
                </button>
                <button
                  onClick={handleNext}
                  aria-label="Next feature"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white text-ink transition hover:bg-ink hover:text-white shadow-sm"
                >
                  →
                </button>
                <div className="h-[2px] w-28 bg-line relative overflow-hidden rounded-full ml-2">
                  <div
                    className="absolute inset-y-0 left-0 bg-ink transition-all duration-300"
                    style={{
                      width: `${((safeIndex + 1) / featureList.length) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Right Secondary Feature Previews - Scrollable container if > 4 items */}
          <div
            className={`lg:col-span-3 flex flex-col gap-3.5 ${
              featureList.length > 4
                ? "max-h-[380px] overflow-y-auto pr-1.5 scrollbar-thin scrollbar-thumb-line"
                : ""
            }`}
          >
            {featureList.map((feat, idx) => (
              <button
                key={feat.id || idx}
                onClick={() => setActiveIndex(idx)}
                className={`group flex items-center gap-3 rounded-2xl border p-3 text-left transition shrink-0 ${
                  idx === safeIndex
                    ? "border-ink bg-surface shadow-sm ring-1 ring-ink/10"
                    : "border-line bg-paper hover:border-ink/30"
                }`}
              >
                {feat.image ? (
                  <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl bg-surface">
                    <Image
                      src={feat.image}
                      alt={feat.tag || feat.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-surface text-ink text-xs font-bold border border-line">
                    #{idx + 1}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-semibold text-ink truncate">
                    {feat.tag || feat.title}
                  </p>
                  <p className="text-[10px] text-ink2 mt-0.5">Click to view</p>
                </div>
              </button>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
}
