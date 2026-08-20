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
    ])
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
      <div className="aspect-[4/5] overflow-hidden rounded-card bg-surface flex items-center justify-center text-[13px] text-ink2">
        Product image coming soon
      </div>
    );
  }

  const currentImage = allImages[selectedIndex] || allImages[0];

  return (
    <div className="space-y-4">
      {/* Main Display Image - Preserving original design aspect ratio and styling */}
      <div className="group relative aspect-[4/5] overflow-hidden rounded-card bg-surface border border-line/40 shadow-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={currentImage}
          src={currentImage}
          alt={`${productName} - Image ${selectedIndex + 1}`}
          className="h-full w-full object-cover transition-opacity duration-300"
        />

        {/* Hover overlay arrows on the main image */}
        {allImages.length > 1 && (
          <div className="absolute inset-x-3 top-1/2 flex -translate-y-1/2 justify-between opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <button
              onClick={handlePrev}
              aria-label="Previous image"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white/90 text-ink backdrop-blur-sm transition hover:bg-white active:scale-95 shadow-md"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={handleNext}
              aria-label="Next image"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white/90 text-ink backdrop-blur-sm transition hover:bg-white active:scale-95 shadow-md"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Thumbnails Row Carousel & Left/Right Controls */}
      {allImages.length > 1 && (
        <div className="space-y-3">
          {/* Scrollable Thumbnails Track */}
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
                  className={`relative aspect-square w-[calc(25%-9px)] min-w-[70px] shrink-0 snap-start overflow-hidden rounded-card bg-white p-1 border transition-all duration-200 focus:outline-none ${
                    isSelected
                      ? "border-ink ring-2 ring-ink/20 opacity-100 shadow-sm"
                      : "border-line/70 opacity-70 hover:opacity-100 hover:border-ink/50"
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

          {/* Left & Right Circular Arrow Buttons */}
          <div className="flex items-center justify-end pt-1">
            <div className="flex items-center gap-2.5">
              <button
                onClick={handlePrev}
                aria-label="Previous image"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-neutral-400/80 bg-white text-ink transition hover:border-ink hover:bg-neutral-50 active:scale-95 shadow-sm"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>

              <button
                onClick={handleNext}
                aria-label="Next image"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-neutral-400/80 bg-white text-ink transition hover:border-ink hover:bg-neutral-50 active:scale-95 shadow-sm"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
