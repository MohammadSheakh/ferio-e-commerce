"use client";

import { useState } from "react";
import Image from "next/image";
import type { CatalogFeature } from "@/lib/catalog";

interface ProductFeaturesSectionProps {
  features?: CatalogFeature[];
}

export default function ProductFeaturesSection({
  features,
}: ProductFeaturesSectionProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  const featureList = features ?? [];

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
      (prev) => (prev - 1 + featureList.length) % featureList.length,
    );
  };

  return (
    <section className="mt-16 border-t border-line pt-12">
      <div>
        <h2 className="mb-8 text-[18px] font-semibold text-ink">
          Product features
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Main Feature Image */}
          <div className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-card border border-line bg-surface lg:col-span-5">
            {currentFeature.image ? (
              <Image
                src={currentFeature.image}
                alt={currentFeature.title}
                fill
                className="object-cover"
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
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white text-ink transition hover:border-ink"
                >
                  ←
                </button>
                <button
                  onClick={handleNext}
                  aria-label="Next feature"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white text-ink transition hover:border-ink"
                >
                  →
                </button>
                <div className="relative ml-2 h-px w-28 overflow-hidden bg-line">
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
                aria-pressed={idx === safeIndex}
                className={`group flex shrink-0 items-center gap-3 rounded-card border p-3 text-left transition ${
                  idx === safeIndex
                    ? "border-ink bg-surface"
                    : "border-line bg-paper hover:border-ink/30"
                }`}
              >
                {feat.image ? (
                  <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-card bg-surface">
                    <Image
                      src={feat.image}
                      alt={feat.tag || feat.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-card border border-line bg-surface text-xs font-bold text-ink">
                    #{idx + 1}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-semibold text-ink truncate">
                    {feat.tag || feat.title}
                  </p>
                  <p className="mt-0.5 text-[10px] text-ink2">View feature</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
