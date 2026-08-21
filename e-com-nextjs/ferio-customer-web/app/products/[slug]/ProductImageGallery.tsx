"use client";

import { useState, useRef, useEffect } from "react";

type ProductImageGalleryProps = {
  mainImage: string | null;
  images: string[];
  productName: string;
};

export default function ProductImageGallery({
  mainImage,
  images,
  productName,
}: ProductImageGalleryProps) {
  // Combine mainImage and images list while deduplicating
  const allImages = Array.from(
    new Set([
      ...(mainImage ? [mainImage] : []),
      ...(Array.isArray(images) ? images : []),
    ]),
  ).filter((img) => typeof img === "string" && img.trim().length > 0);

  const [selectedIndex, setSelectedIndex] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const thumbnailRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Scroll active thumbnail smoothly within the container ONLY (without scrolling the main page window)
  useEffect(() => {
    const activeThumb = thumbnailRefs.current[selectedIndex];
    const container = scrollContainerRef.current;
    if (activeThumb && container) {
      const thumbLeft = activeThumb.offsetLeft;
      const thumbWidth = activeThumb.offsetWidth;
      const containerWidth = container.clientWidth;
      const targetScrollLeft = thumbLeft - containerWidth / 2 + thumbWidth / 2;
      container.scrollTo({
        left: targetScrollLeft,
        behavior: "smooth",
      });
    }
  }, [selectedIndex]);

  const handlePrev = () => {
    if (allImages.length <= 1) return;
    setSelectedIndex((prev) => (prev === 0 ? allImages.length - 1 : prev - 1));
  };

  const handleNext = () => {
    if (allImages.length <= 1) return;
    setSelectedIndex((prev) => (prev === allImages.length - 1 ? 0 : prev + 1));
  };

  if (allImages.length === 0) {
    return (
      <div className="flex aspect-[4/5] items-center justify-center overflow-hidden rounded-card border border-line bg-surface text-[13px] text-ink2">
        Product image coming soon
      </div>
    );
  }

  const currentImage = allImages[selectedIndex] || allImages[0];

  return (
    <div className="space-y-4">
      <div className="group relative aspect-[4/5] overflow-hidden rounded-card border border-line bg-surface">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={currentImage}
          src={currentImage}
          alt={`${productName} - Image ${selectedIndex + 1}`}
          className="h-full w-full object-cover motion-safe:transition-opacity motion-safe:duration-300"
        />

        {allImages.length > 1 && (
          <div className="absolute inset-x-3 top-1/2 flex -translate-y-1/2 justify-between opacity-100 sm:opacity-0 sm:transition-opacity sm:duration-200 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
            <button
              onClick={handlePrev}
              aria-label="Previous image"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white text-ink transition hover:border-ink"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <button
              onClick={handleNext}
              aria-label="Next image"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white text-ink transition hover:border-ink"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
        )}
      </div>

      {allImages.length > 1 && (
        <div className="space-y-3">
          <div
            ref={scrollContainerRef}
            className="flex gap-3 overflow-x-auto py-1 scrollbar-none snap-x snap-mandatory"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {allImages.map((image, index) => {
              const isSelected = index === selectedIndex;
              return (
                <button
                  key={`${image}-${index}`}
                  ref={(el) => {
                    thumbnailRefs.current[index] = el;
                  }}
                  onClick={() => setSelectedIndex(index)}
                  aria-label={`View ${productName} image ${index + 1}`}
                  aria-pressed={isSelected}
                  className={`relative aspect-square w-[calc(25%-9px)] min-w-[70px] shrink-0 snap-start overflow-hidden rounded-card border bg-white p-1 transition-opacity duration-200 ${
                    isSelected
                      ? "border-ink opacity-100"
                      : "border-line opacity-60 hover:border-ink/50 hover:opacity-100"
                  }`}
                >
                  <div className="h-full w-full overflow-hidden rounded-[inherit]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image}
                      alt={`${productName} thumbnail ${index + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between border-t border-line pt-3">
            <p className="text-[11px] text-ink2">
              Image {selectedIndex + 1} of {allImages.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrev}
                aria-label="Previous image"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white text-ink transition hover:border-ink"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
              </button>

              <button
                onClick={handleNext}
                aria-label="Next image"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white text-ink transition hover:border-ink"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M14 5l7 7m0 0l-7 7m7-7H3"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
