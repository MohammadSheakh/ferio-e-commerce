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

export default function ReviewSection({
  productId,
  content,
}: {
  productId: string;
  content: Content | null;
}) {
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const reviews = content?.youtubeReviews ?? [];
  const banners = content?.reviewBanners ?? [];

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");
    const form = new FormData(event.currentTarget);

    try {
      const response = await fetch(`/api/products/${productId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          youtubeUrl: form.get("youtubeUrl"),
          title: form.get("title") || undefined,
          reviewerName: form.get("reviewerName") || undefined,
        }),
      });
      const payload = await response.json();
      if (response.ok) {
        setMessage("Thank you. Your review was submitted for admin approval.");
        event.currentTarget.reset();
      } else {
        setMessage(payload.message || "Failed to submit review.");
      }
    } catch {
      setMessage("An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const submissionSucceeded = message.startsWith("Thank you");

  return (
    <section className="mt-16 border-t border-line pt-12">
      <div className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-[18px] font-semibold text-ink">
            YouTube reviews
          </h2>
          <p className="mt-1 text-xs text-ink2">
            Approved product walkthroughs, unboxings, and customer videos.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setMessage("");
            setIsModalOpen(true);
          }}
          className="self-start rounded-full bg-ink px-6 py-2.5 text-xs font-medium text-white transition hover:opacity-85 sm:self-auto"
        >
          Submit a YouTube review
        </button>
      </div>

      {banners.length > 0 && (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {banners.map((banner) => (
            <div
              key={banner.id}
              className="aspect-[3/1] overflow-hidden rounded-card border border-line bg-surface"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={banner.imageUrl}
                alt={banner.altText ?? "Product review banner"}
                className="h-full w-full object-cover"
              />
            </div>
          ))}
        </div>
      )}

      {reviews.length > 0 ? (
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          {reviews.map((review) => (
            <article
              key={review.id}
              className="rounded-card border border-line bg-white p-3"
            >
              <div className="aspect-video overflow-hidden rounded-card bg-black">
                <iframe
                  className="h-full w-full"
                  src={`https://www.youtube-nocookie.com/embed/${review.youtubeVideoId}`}
                  title={review.title ?? "Product review"}
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
              <div className="px-1 pb-1 pt-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold leading-snug text-ink">
                    {review.title ?? "Product review"}
                  </h3>
                  {review.isFeatured && (
                    <span className="rounded-full bg-surface px-2.5 py-1 text-[10px] font-medium text-ink2">
                      Featured
                    </span>
                  )}
                </div>
                {review.reviewerName && (
                  <p className="mt-1 text-xs text-ink2">
                    By {review.reviewerName}
                  </p>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-card border border-dashed border-line bg-surface p-8 text-center">
          <p className="text-sm font-medium text-ink">
            No approved video reviews yet
          </p>
          <p className="mt-1 text-xs text-ink2">
            Signed-in customers can submit a YouTube review for moderation.
          </p>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="youtube-review-dialog-title"
            className="w-full max-w-xl rounded-card border border-line bg-paper p-6 md:p-8"
          >
            <div className="flex items-start justify-between gap-6 border-b border-line pb-4">
              <div>
                <h3
                  id="youtube-review-dialog-title"
                  className="text-base font-semibold text-ink"
                >
                  Submit a YouTube review
                </h3>
                <p className="mt-1 text-xs text-ink2">
                  Share an unboxing or review video for this product.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-xs text-ink2 underline decoration-line underline-offset-4 hover:text-ink"
              >
                Close
              </button>
            </div>

            <form onSubmit={submit} className="mt-5 space-y-4">
              <div>
                <label
                  htmlFor="youtube-review-url"
                  className="mb-1 block text-[11px] uppercase tracking-eyebrow text-ink2"
                >
                  YouTube video link
                </label>
                <input
                  id="youtube-review-url"
                  name="youtubeUrl"
                  required
                  type="url"
                  placeholder="https://youtube.com/watch?v=..."
                  className="w-full rounded-card border border-line bg-white px-4 py-2.5 text-xs text-ink focus:border-ink"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="youtube-review-title"
                    className="mb-1 block text-[11px] uppercase tracking-eyebrow text-ink2"
                  >
                    Video title (optional)
                  </label>
                  <input
                    id="youtube-review-title"
                    name="title"
                    placeholder="Unboxing and 30-day review"
                    className="w-full rounded-card border border-line bg-white px-4 py-2.5 text-xs text-ink focus:border-ink"
                  />
                </div>
                <div>
                  <label
                    htmlFor="youtube-reviewer-name"
                    className="mb-1 block text-[11px] uppercase tracking-eyebrow text-ink2"
                  >
                    Reviewer name (optional)
                  </label>
                  <input
                    id="youtube-reviewer-name"
                    name="reviewerName"
                    placeholder="Channel or reviewer name"
                    className="w-full rounded-card border border-line bg-white px-4 py-2.5 text-xs text-ink focus:border-ink"
                  />
                </div>
              </div>

              {message && (
                <div
                  role={submissionSucceeded ? "status" : "alert"}
                  className={`rounded-card border p-3 text-xs ${
                    submissionSucceeded
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-rose-200 bg-rose-50 text-rose-800"
                  }`}
                >
                  {message}
                </div>
              )}

              <p className="text-[11px] text-ink2">
                Submissions appear only after Admin moderation.
              </p>

              <div className="flex items-center justify-end gap-3 border-t border-line pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-full border border-line px-5 py-2 text-xs font-medium text-ink hover:border-ink"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-full bg-ink px-6 py-2 text-xs font-medium text-white transition hover:opacity-85 disabled:opacity-50"
                >
                  {isSubmitting ? "Submitting…" : "Submit review"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
