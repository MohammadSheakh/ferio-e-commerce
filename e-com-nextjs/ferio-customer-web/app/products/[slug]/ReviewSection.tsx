"use client";

import { FormEvent, useRef, useState } from "react";

type Content = {
  reviewBanners: Array<{
    id: string;
    imageUrl: string;
    altText: string | null;
  }>;
  youtubeReviews: Array<{
    id: string;
    youtubeVideoId: string;
    title: string | null;
    reviewerName: string | null;
    isFeatured: boolean;
  }>;
};

const DEMO_YOUTUBE_REVIEWS = [
  {
    id: "yt-demo-1",
    youtubeVideoId: "dQw4w9WgXcQ",
    title: "Official Product Walkthrough & Specs Overview",
    reviewerName: "Ferio Official",
    isFeatured: true,
  },
  {
    id: "yt-demo-2",
    youtubeVideoId: "dQw4w9WgXcQ",
    title: "Customer Unboxing & Hands-on Impression",
    reviewerName: "Tech Reviewer",
    isFeatured: false,
  },
  {
    id: "yt-demo-3",
    youtubeVideoId: "dQw4w9WgXcQ",
    title: "Long-term Durability & Performance Test",
    reviewerName: "Gadget Guru",
    isFeatured: false,
  },
  {
    id: "yt-demo-4",
    youtubeVideoId: "dQw4w9WgXcQ",
    title: "Comparison & Feature Deep Dive",
    reviewerName: "Tech Explorer",
    isFeatured: false,
  },
];

export default function ReviewSection({
  productId,
  content,
}: {
  productId: string;
  content: Content | null;
}) {
  const [msg, setMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAllVideos, setShowAllVideos] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setMsg("");
    const f = new FormData(e.currentTarget);
    try {
      const r = await fetch(`/api/products/${productId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          youtubeUrl: f.get("youtubeUrl"),
          title: f.get("title") || undefined,
          reviewerName: f.get("reviewerName") || undefined,
        }),
      });
      const p = await r.json();
      if (r.ok) {
        setMsg("Thank you! Your review was submitted for admin approval.");
        e.currentTarget.reset();
      } else {
        setMsg(p.message || "Failed to submit review.");
      }
    } catch {
      setMsg("An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const reviews =
    content?.youtubeReviews && content.youtubeReviews.length > 0
      ? content.youtubeReviews
      : DEMO_YOUTUBE_REVIEWS;

  // Filter videos based on feature mode
  const featuredReviews = reviews.filter((r) => r.isFeatured);
  const mainVideos = featuredReviews.length > 0 ? featuredReviews : [reviews[0]];
  const otherVideos = reviews.filter((r) => !mainVideos.includes(r));

  const activeVideos = showAllVideos ? reviews : mainVideos;
  const totalCount = activeVideos.length;

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = containerRef.current;
    const maxScroll = scrollWidth - clientWidth;
    if (maxScroll <= 0) {
      setCurrentIndex(0);
      return;
    }
    const ratio = scrollLeft / maxScroll;
    const newIndex = Math.min(
      totalCount - 1,
      Math.round(ratio * (totalCount - 1))
    );
    setCurrentIndex(newIndex);
  };

  const scrollToIndex = (index: number) => {
    if (!containerRef.current) return;
    const target = Math.max(0, Math.min(totalCount - 1, index));
    const cardWidth = containerRef.current.children[0]?.getBoundingClientRect().width || 420;
    containerRef.current.scrollTo({
      left: target * (cardWidth + 24),
      behavior: "smooth",
    });
    setCurrentIndex(target);
  };

  const handlePrev = () => {
    scrollToIndex(currentIndex - 1);
  };

  const handleNext = () => {
    scrollToIndex(currentIndex + 1);
  };

  // Calculate red progress line percentage
  const progressPercent = totalCount > 1 ? ((currentIndex + 1) / totalCount) * 100 : 100;

  return (
    <section className="mt-16 border-t border-line pt-12">
      <div className="rounded-card border border-line bg-paper p-6 md:p-10 shadow-sm space-y-6">
        
        {/* Header with Title & Action Buttons */}
        <div className="flex flex-col gap-4 border-b border-line pb-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-ink">
              YouTube Video Reviews
            </h2>
            <p className="mt-1 text-xs text-ink2">
              Watch featured video walkthroughs and customer unboxings
            </p>
          </div>

          {/* Action Buttons styled matching Write A Review button */}
          <div className="flex flex-wrap items-center gap-3">
            {/* 1. Submit YouTube Review Modal Button */}
            <button
              onClick={() => {
                setMsg("");
                setIsModalOpen(true);
              }}
              className="rounded-full bg-ink px-6 py-2.5 text-xs font-semibold text-white tracking-wider uppercase transition hover:opacity-85 shadow-sm"
            >
              SUBMIT A YOUTUBE REVIEW
            </button>

            {/* 2. Show Featured Video Only / View All Videos button */}
            {otherVideos.length > 0 && (
              <button
                onClick={() => {
                  setShowAllVideos(!showAllVideos);
                  setCurrentIndex(0);
                  if (containerRef.current) containerRef.current.scrollTo({ left: 0 });
                }}
                className="rounded-full border border-line bg-white px-6 py-2.5 text-xs font-semibold text-ink tracking-wider uppercase transition hover:bg-ink hover:text-white shadow-sm"
              >
                {showAllVideos
                  ? "SHOW FEATURED VIDEOS ONLY"
                  : `VIEW ALL VIDEOS (${reviews.length})`}
              </button>
            )}
          </div>
        </div>

        {/* Video Banners (if any) */}
        {content?.reviewBanners && content.reviewBanners.length > 0 && (
          <div className="grid gap-3 md:grid-cols-2">
            {content.reviewBanners.map((b) => (
              <div
                key={b.id}
                className="aspect-[3/1] overflow-hidden rounded-card bg-surface border border-line"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={b.imageUrl}
                  alt={b.altText ?? "Product review banner"}
                  className="h-full w-full object-cover"
                />
              </div>
            ))}
          </div>
        )}

        {/* Horizontal Carousel Track Container */}
        <div className="relative">
          <div
            ref={containerRef}
            onScroll={handleScroll}
            className="flex gap-6 overflow-x-auto scroll-smooth snap-x snap-mandatory py-2 scrollbar-none"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {activeVideos.map((r) => (
              <article
                key={r.id}
                className={`snap-start shrink-0 w-[85vw] sm:w-[380px] md:w-[440px] rounded-2xl border p-3.5 transition-all duration-300 ${
                  r.isFeatured
                    ? "border-amber-400/80 bg-amber-50/20 shadow-sm"
                    : "border-line bg-surface"
                }`}
              >
                <div className="relative aspect-video overflow-hidden rounded-xl bg-black">
                  <iframe
                    className="h-full w-full"
                    src={`https://www.youtube-nocookie.com/embed/${r.youtubeVideoId}`}
                    title={r.title ?? "Product review"}
                    allowFullScreen
                  />
                </div>
                <div className="mt-3.5 px-1">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-bold text-ink leading-snug line-clamp-2">
                      {r.title ?? "Product review"}
                    </h4>
                    {r.isFeatured && (
                      <span className="shrink-0 rounded-full bg-amber-500 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
                        ⭐ Featured
                      </span>
                    )}
                  </div>
                  {r.reviewerName && (
                    <p className="mt-1 text-xs font-medium text-ink2">
                      By {r.reviewerName}
                    </p>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>

        {/* Progress Line & Circular Arrow Navigation */}
        <div className="flex items-center justify-between pt-4 border-t border-line/60">
          
          {/* Left: Slide Index Indicator with Progress Track Line */}
          <div className="flex items-center gap-3 w-64 md:w-80">
            <span className="text-sm font-bold text-ink tracking-tight font-mono">
              {String(currentIndex + 1).padStart(2, "0")}
            </span>
            
            {/* Progress Track */}
            <div className="relative h-[2px] flex-1 bg-neutral-200 rounded-full overflow-hidden">
              <div
                className="absolute left-0 top-0 h-full bg-red-600 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <span className="text-sm font-bold text-ink tracking-tight font-mono">
              {String(totalCount).padStart(2, "0")}
            </span>
          </div>

          {/* Right: Circular Navigation Arrow Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              aria-label="Previous slide"
              className="flex h-12 w-12 items-center justify-center rounded-full border border-neutral-300 bg-white text-ink transition hover:border-ink hover:bg-neutral-50 active:scale-95 disabled:opacity-30 disabled:hover:border-neutral-300 disabled:hover:bg-white shadow-sm"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>

            <button
              onClick={handleNext}
              disabled={currentIndex >= totalCount - 1}
              aria-label="Next slide"
              className="flex h-12 w-12 items-center justify-center rounded-full border border-neutral-300 bg-white text-ink transition hover:border-ink hover:bg-neutral-50 active:scale-95 disabled:opacity-30 disabled:hover:border-neutral-300 disabled:hover:bg-white shadow-sm"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>

        </div>

      </div>

      {/* Modal Dialog for Submitting YouTube Review */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-xl rounded-2xl border border-line bg-paper p-6 md:p-8 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div>
                <h3 className="text-base font-bold text-ink">Submit a YouTube Video Review</h3>
                <p className="text-xs text-ink2 mt-0.5">
                  Share your unboxing or review video link for this product
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-ink2 hover:text-ink text-sm font-medium"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-ink uppercase mb-1">
                  YouTube Video Link *
                </label>
                <input
                  name="youtubeUrl"
                  required
                  type="url"
                  placeholder="https://youtube.com/watch?v=..."
                  className="w-full rounded-card border border-line bg-surface px-4 py-2.5 text-xs text-ink focus:border-ink focus:outline-none"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-ink uppercase mb-1">
                    Video Title (Optional)
                  </label>
                  <input
                    name="title"
                    placeholder="e.g. Unboxing & 30-Day Review"
                    className="w-full rounded-card border border-line bg-surface px-4 py-2.5 text-xs text-ink focus:border-ink focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-ink uppercase mb-1">
                    Reviewer Name (Optional)
                  </label>
                  <input
                    name="reviewerName"
                    placeholder="e.g. Tech Channel / Your Name"
                    className="w-full rounded-card border border-line bg-surface px-4 py-2.5 text-xs text-ink focus:border-ink focus:outline-none"
                  />
                </div>
              </div>

              {msg && (
                <div className={`rounded-card p-3 text-xs font-medium border ${
                  msg.includes("Thank you")
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : "bg-rose-50 text-rose-800 border-rose-200"
                }`}>
                  {msg}
                </div>
              )}

              <p className="text-[11px] text-ink2">
                Note: All submissions are moderated by admins before appearing on the product page.
              </p>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-full border border-line px-5 py-2 text-xs font-medium text-ink hover:bg-surface"
                >
                  Cancel
                </button>
                <button
                  disabled={isSubmitting}
                  className="rounded-full bg-ink px-6 py-2 text-xs font-bold text-white transition hover:opacity-85 shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? "Submitting..." : "Submit Review"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
