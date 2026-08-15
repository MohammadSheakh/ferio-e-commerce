"use client";

import { useState } from "react";
import Image from "next/image";

interface CustomerReview {
  id: string;
  authorName: string;
  authorHandle: string;
  avatarLetter: string;
  isProvenBuyer: boolean;
  rating: number;
  date: string;
  comment: string;
  photoUrl?: string;
}

const DEFAULT_REVIEWS: CustomerReview[] = [
  {
    id: "rev-1",
    authorName: "Asya",
    authorHandle: "@aska_aiki",
    avatarLetter: "A",
    isProvenBuyer: true,
    rating: 5,
    date: "2026-07-04",
    comment: "The cat appreciated the couch)) Excellent quality and build!",
    photoUrl:
      "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "rev-2",
    authorName: "Ekaterina",
    authorHandle: "@meshkova.ekaterina",
    avatarLetter: "E",
    isProvenBuyer: true,
    rating: 5,
    date: "2026-07-01",
    comment:
      "Thank you very much for the service! The sofa was brought in one day, I could not believe that this happens at all! The sofa is beautiful!",
    photoUrl:
      "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=600&q=80",
  },
];

export default function CustomerReviewsSection({
  productId,
}: {
  productId: string;
}) {
  const [reviewsList, setReviewsList] =
    useState<CustomerReview[]>(DEFAULT_REVIEWS);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [comment, setComment] = useState("");
  const [rating, setRating] = useState(5);
  const [submitted, setSubmitted] = useState(false);

  const handleWriteReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !comment.trim()) return;

    const newRev: CustomerReview = {
      id: `rev-${Date.now()}`,
      authorName: name,
      authorHandle: handle ? (handle.startsWith("@") ? handle : `@${handle}`) : "@buyer",
      avatarLetter: name.charAt(0).toUpperCase(),
      isProvenBuyer: true,
      rating,
      date: new Date().toISOString().split("T")[0],
      comment,
    };

    setReviewsList([newRev, ...reviewsList]);
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setIsModalOpen(false);
      setName("");
      setHandle("");
      setComment("");
    }, 1500);
  };

  return (
    <section className="mt-16 border-t border-line pt-12">
      <div className="rounded-card border border-line bg-paper p-6 md:p-10 shadow-sm">
        
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-8 border-b border-line">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-ink">
              Customer Reviews ({reviewsList.length})
            </h2>
            <p className="text-xs text-ink2 mt-1">
              Real feedback from verified buyers
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="rounded-full bg-ink px-6 py-2.5 text-xs font-semibold text-white transition hover:opacity-85 shadow-sm"
          >
            WRITE A REVIEW
          </button>
        </div>

        {/* Reviews List */}
        <div className="divide-y divide-line">
          {reviewsList.map((rev) => (
            <div
              key={rev.id}
              className="py-8 flex flex-col md:flex-row gap-6 items-start"
            >
              {/* Review Attached Photo (if present) */}
              {rev.photoUrl && (
                <div className="relative aspect-[4/3] w-full md:w-64 flex-shrink-0 overflow-hidden rounded-2xl border border-line bg-surface">
                  <Image
                    src={rev.photoUrl}
                    alt="Customer review photo"
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 250px"
                  />
                </div>
              )}

              {/* Review Author & Comment */}
              <div className="flex-1 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface text-ink font-bold text-sm border border-line">
                      {rev.avatarLetter}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-ink leading-none">
                        {rev.authorName}
                      </h4>
                      <p className="text-xs text-ink2 mt-1">
                        {rev.authorHandle}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {rev.isProvenBuyer && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 border border-emerald-200">
                        <span>✓</span>
                        <span>Proven buyer</span>
                      </span>
                    )}
                    <div className="flex text-amber-400 text-xs">
                      {"★".repeat(rev.rating)}
                      {"☆".repeat(5 - rev.rating)}
                    </div>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-ink leading-relaxed pt-1">
                  {rev.comment}
                </p>

                <p className="text-[11px] text-ink2">{rev.date}</p>
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* Write a Review Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-card border border-line bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <h3 className="text-base font-bold text-ink">Write a Review</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-ink2 hover:text-ink text-sm font-medium"
              >
                ✕
              </button>
            </div>

            {submitted ? (
              <div className="py-8 text-center space-y-2">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-ink text-white text-sm font-bold">
                  ✓
                </div>
                <h4 className="text-sm font-bold text-ink">Review Submitted!</h4>
                <p className="text-xs text-ink2">
                  Thank you for sharing your experience.
                </p>
              </div>
            ) : (
              <form onSubmit={handleWriteReview} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-ink uppercase mb-1">
                    Your Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Asya, Ekaterina"
                    className="w-full rounded-card border border-line bg-surface px-4 py-2.5 text-xs text-ink focus:border-ink focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink uppercase mb-1">
                    Instagram Handle (Optional)
                  </label>
                  <input
                    type="text"
                    value={handle}
                    onChange={(e) => setHandle(e.target.value)}
                    placeholder="@aska_aiki"
                    className="w-full rounded-card border border-line bg-surface px-4 py-2.5 text-xs text-ink focus:border-ink focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink uppercase mb-1">
                    Rating
                  </label>
                  <select
                    value={rating}
                    onChange={(e) => setRating(Number(e.target.value))}
                    className="w-full rounded-card border border-line bg-surface px-4 py-2.5 text-xs text-ink focus:border-ink focus:outline-none"
                  >
                    <option value={5}>★★★★★ (5/5 Excellent)</option>
                    <option value={4}>★★★★☆ (4/5 Very Good)</option>
                    <option value={3}>★★★☆☆ (3/5 Good)</option>
                    <option value={2}>★★☆☆☆ (2/5 Fair)</option>
                    <option value={1}>★☆☆☆☆ (1/5 Poor)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink uppercase mb-1">
                    Your Review
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Share your thoughts about this product..."
                    className="w-full rounded-card border border-line bg-surface px-4 py-2.5 text-xs text-ink focus:border-ink focus:outline-none"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="rounded-full border border-line px-5 py-2 text-xs font-medium text-ink hover:bg-surface"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-full bg-ink px-6 py-2 text-xs font-bold text-white transition hover:opacity-85 shadow-sm"
                  >
                    Submit Review
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
