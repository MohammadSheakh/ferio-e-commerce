"use client";

import { FormEvent, useState } from "react";

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
    title: "July 36 Days - Full Review & Unboxing",
    reviewerName: "July 36 video",
    isFeatured: true,
  },
  {
    id: "yt-demo-2",
    youtubeVideoId: "dQw4w9WgXcQ",
    title: "Kenneth Cole Blue Perfume Full Review in Bangla",
    reviewerName: "perfume review by fariha nuba",
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
  const [currentSlide, setCurrentSlide] = useState(0);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
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
    setMsg(r.ok ? "Submitted for Admin review." : p.message);
    if (r.ok) e.currentTarget.reset();
  }

  const reviews =
    content?.youtubeReviews && content.youtubeReviews.length > 0
      ? content.youtubeReviews
      : DEMO_YOUTUBE_REVIEWS;

  const handleNext = () => {
    setCurrentSlide((prev) => (prev + 1) % reviews.length);
  };

  const handlePrev = () => {
    setCurrentSlide((prev) => (prev - 1 + reviews.length) % reviews.length);
  };

  return (
    <section className="mt-16 border-t border-line pt-12">
      <div className="rounded-card border border-line bg-paper p-6 md:p-10 shadow-sm">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-6 border-b border-line">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-ink">
              YouTube Video Reviews
            </h2>
            <p className="text-xs text-ink2 mt-1">
              Watch featured video walkthroughs and customer unboxings
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrev}
              aria-label="Previous video"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-white text-ink transition hover:bg-ink hover:text-white shadow-sm"
            >
              ←
            </button>
            <button
              onClick={handleNext}
              aria-label="Next video"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-white text-ink transition hover:bg-ink hover:text-white shadow-sm"
            >
              →
            </button>
          </div>
        </div>

        {/* Video Banners (if any) */}
        {content?.reviewBanners && content.reviewBanners.length > 0 && (
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {content.reviewBanners.map((b) => (
              <div
                key={b.id}
                className="aspect-[3/1] overflow-hidden rounded-card bg-surface"
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

        {/* Carousel Style Video Grid */}
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {reviews.map((r) => (
            <article
              key={r.id}
              className="group rounded-2xl border border-line bg-surface p-3 transition hover:shadow-md"
            >
              <div className="relative aspect-video overflow-hidden rounded-xl bg-black">
                <iframe
                  className="h-full w-full"
                  src={`https://www.youtube-nocookie.com/embed/${r.youtubeVideoId}`}
                  title={r.title ?? "Product review"}
                  allowFullScreen
                />
              </div>
              <div className="mt-3 px-1">
                <h4 className="text-sm font-bold text-ink leading-snug line-clamp-1">
                  {r.title ?? "Product review"}
                  {r.isFeatured && (
                    <span className="ml-2 rounded-full bg-ink px-2 py-0.5 text-[10px] font-semibold text-white">
                      Featured
                    </span>
                  )}
                </h4>
                {r.reviewerName && (
                  <p className="text-xs text-ink2 mt-1">
                    By {r.reviewerName}
                  </p>
                )}
              </div>
            </article>
          ))}
        </div>

        {/* Submit Review Form */}
        <form
          onSubmit={submit}
          className="mt-10 max-w-2xl rounded-2xl border border-line bg-surface p-6 space-y-4"
        >
          <h3 className="text-sm font-bold text-ink uppercase tracking-eyebrow">
            Submit a YouTube review
          </h3>
          <p className="text-xs text-ink2">
            Sign in first. Every submission is reviewed before publication.
          </p>

          <input
            name="youtubeUrl"
            required
            type="url"
            placeholder="https://youtube.com/watch?v=…"
            className="w-full rounded-card border border-line bg-white px-4 py-2.5 text-xs text-ink focus:border-ink focus:outline-none"
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <input
              name="title"
              placeholder="Video title"
              className="rounded-card border border-line bg-white px-4 py-2.5 text-xs text-ink focus:border-ink focus:outline-none"
            />
            <input
              name="reviewerName"
              placeholder="Reviewer name"
              className="rounded-card border border-line bg-white px-4 py-2.5 text-xs text-ink focus:border-ink focus:outline-none"
            />
          </div>

          {msg && <p className="text-xs text-ink2">{msg}</p>}

          <button className="rounded-full bg-ink px-6 py-2.5 text-xs font-semibold text-white transition hover:opacity-85 shadow-sm">
            Submit for review
          </button>
        </form>

      </div>
    </section>
  );
}
