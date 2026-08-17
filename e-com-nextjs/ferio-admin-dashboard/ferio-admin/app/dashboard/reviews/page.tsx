"use client";

import { FormEvent, useEffect, useState } from "react";
import Topbar from "@/components/Topbar";

type Review = {
  id: string;
  youtubeUrl: string;
  youtubeVideoId: string;
  title: string | null;
  reviewerName: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  isFeatured: boolean;
  rejectionReason: string | null;
  product: { id?: string; name: string };
  submittedBy: { name: string; email: string };
  createdAt?: string;
};

export default function ReviewsPage() {
  const [items, setItems] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [actionId, setActionId] = useState("");

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/product-content/reviews");
      const p = (await r.json()) as { data?: Review[] };
      setItems(p.data ?? []);
    } catch {
      setMsg("Failed to load reviews.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function moderate(
    id: string,
    status?: "APPROVED" | "REJECTED",
    isFeatured?: boolean
  ) {
    setActionId(id);
    setMsg("");
    try {
      let rejectionReason: string | undefined;
      if (status === "REJECTED") {
        const reason = window.prompt("Reason for rejection:", "Not suitable for publication");
        if (!reason) {
          setActionId("");
          return;
        }
        rejectionReason = reason;
      }

      const r = await fetch(`/api/product-content/reviews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          isFeatured,
          rejectionReason,
        }),
      });
      const res = (await r.json()) as { message?: string };
      if (!r.ok) throw new Error(res.message || "Failed to update review.");

      setMsg(isFeatured ? "Review marked as featured!" : "Review updated successfully.");
      await load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Unable to update review.");
    } finally {
      setActionId("");
    }
  }

  async function deleteReview(id: string) {
    if (!window.confirm("Delete this review permanently?")) return;
    setActionId(id);
    try {
      const r = await fetch(`/api/product-content/reviews/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error("Failed to delete.");
      setMsg("Review deleted.");
      await load();
    } catch {
      setMsg("Unable to delete review.");
    } finally {
      setActionId("");
    }
  }

  async function addBanner(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const productId = String(f.get("productId")).trim();
    if (!productId) return;

    setMsg("");
    try {
      const r = await fetch(`/api/product-content/products/${productId}/banners`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: f.get("imageUrl"),
          altText: f.get("altText") || undefined,
          sortOrder: Number(f.get("sortOrder")),
        }),
      });
      const p = (await r.json()) as { message?: string };
      setMsg(r.ok ? "Banner added successfully." : p.message || "Unable to add banner.");
      if (r.ok) e.currentTarget.reset();
    } catch {
      setMsg("Unable to add banner.");
    }
  }

  return (
    <>
      <Topbar title="YouTube Reviews & Banners" subtitle="Moderate customer video reviews and highlight featured walkthroughs" />
      <main className="p-8 max-w-6xl space-y-8">
        
        {/* Add Banner Section */}
        <div className="rounded-card border border-line bg-white p-5 shadow-sm space-y-3">
          <h2 className="text-[15px] font-semibold text-ink">Add Product Review Banner</h2>
          <p className="text-[12px] text-ink2">Display promotional graphic banners above YouTube video reviews on product pages.</p>
          <form onSubmit={addBanner} className="grid gap-3 md:grid-cols-[1fr_2fr_1fr_90px_auto]">
            <input name="productId" required placeholder="Product ID" className="rounded-card border border-line px-3 py-2 text-[13px] outline-none focus:border-ink" />
            <input name="imageUrl" required type="url" placeholder="Banner Image URL" className="rounded-card border border-line px-3 py-2 text-[13px] outline-none focus:border-ink" />
            <input name="altText" placeholder="Alt text (optional)" className="rounded-card border border-line px-3 py-2 text-[13px] outline-none focus:border-ink" />
            <input name="sortOrder" type="number" min="0" defaultValue="0" className="rounded-card border border-line px-3 py-2 text-[13px] outline-none focus:border-ink" />
            <button className="rounded-full bg-ink px-5 py-2 text-[13px] font-medium text-white shadow-sm hover:opacity-90">
              Add banner
            </button>
          </form>
        </div>

        {msg && (
          <div className="rounded-card border border-line/60 bg-neutral-50 px-4 py-3 text-[13px] font-medium text-ink">
            {msg}
          </div>
        )}

        {/* Reviews List Table */}
        <div className="overflow-hidden rounded-card border border-line bg-white shadow-sm">
          <div className="border-b border-line bg-neutral-50/80 px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-[16px] font-semibold text-ink">Submitted Video Reviews</h2>
              <p className="text-[12px] text-ink2 mt-0.5">Manage approval status and select featured videos for product pages</p>
            </div>
            <span className="rounded-full border border-line bg-white px-3 py-1 text-[12px] font-semibold text-ink">
              Total: {items.length}
            </span>
          </div>

          <div className="divide-y divide-line">
            {items.map((i) => {
              const videoId = i.youtubeVideoId || (i.youtubeUrl.includes("v=") ? i.youtubeUrl.split("v=")[1]?.split("&")[0] : "");
              const thumbUrl = videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null;

              return (
                <div key={i.id} className="p-6 transition hover:bg-neutral-50/50 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  
                  <div className="flex gap-4 items-start">
                    {/* YouTube Thumbnail Preview */}
                    <div className="relative h-20 w-32 shrink-0 overflow-hidden rounded-lg bg-neutral-900 border border-line group">
                      {thumbUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={thumbUrl} alt="YouTube thumbnail" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[10px] text-white">No Thumb</div>
                      )}
                      <a
                        href={i.youtubeUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="absolute inset-0 flex items-center justify-center bg-black/40 text-white font-bold text-xs opacity-0 group-hover:opacity-100 transition"
                      >
                        ▶ Watch
                      </a>
                    </div>

                    {/* Details */}
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-ink text-[14px]">
                          {i.title || "Untitled Review"}
                        </span>
                        
                        {/* Status Badges */}
                        {i.status === "APPROVED" && (
                          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 border border-emerald-200">
                            ✓ APPROVED
                          </span>
                        )}
                        {i.status === "PENDING" && (
                          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800 border border-amber-200">
                            ⏳ PENDING APPROVAL
                          </span>
                        )}
                        {i.status === "REJECTED" && (
                          <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-semibold text-rose-800 border border-rose-200">
                            ✕ REJECTED
                          </span>
                        )}

                        {/* Featured Badge */}
                        {i.isFeatured && (
                          <span className="rounded-full bg-amber-500 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-sm flex items-center gap-1">
                            ⭐ FEATURED ON PRODUCT
                          </span>
                        )}
                      </div>

                      <p className="text-[12px] text-ink2">
                        Product: <strong className="text-ink">{i.product.name}</strong>
                      </p>
                      
                      <p className="text-[11px] text-ink2">
                        Submitted by: {i.reviewerName || i.submittedBy.name} ({i.submittedBy.email})
                      </p>

                      {i.rejectionReason && (
                        <p className="text-[11px] text-rose-700 italic">
                          Rejection Reason: {i.rejectionReason}
                        </p>
                      )}

                      <a
                        href={i.youtubeUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-block text-[11px] text-blue-600 underline hover:text-blue-800"
                      >
                        {i.youtubeUrl}
                      </a>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
                    {/* Approve Button */}
                    {i.status !== "APPROVED" && (
                      <button
                        disabled={actionId === i.id}
                        onClick={() => void moderate(i.id, "APPROVED", false)}
                        className="rounded-full bg-emerald-600 px-4 py-1.5 text-[12px] font-medium text-white hover:bg-emerald-700 disabled:opacity-50 shadow-sm"
                      >
                        Approve
                      </button>
                    )}

                    {/* Feature / Unfeature Button */}
                    {i.isFeatured ? (
                      <button
                        disabled={actionId === i.id}
                        onClick={() => void moderate(i.id, "APPROVED", false)}
                        className="rounded-full border border-amber-400 bg-amber-50 px-3.5 py-1.5 text-[12px] font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-50"
                      >
                        ⭐ Unfeature
                      </button>
                    ) : (
                      <button
                        disabled={actionId === i.id}
                        onClick={() => void moderate(i.id, "APPROVED", true)}
                        className="rounded-full bg-ink px-3.5 py-1.5 text-[12px] font-semibold text-white hover:bg-neutral-800 disabled:opacity-50 shadow-sm flex items-center gap-1"
                      >
                        ⭐ Mark Featured
                      </button>
                    )}

                    {/* Reject Button */}
                    {i.status !== "REJECTED" && (
                      <button
                        disabled={actionId === i.id}
                        onClick={() => void moderate(i.id, "REJECTED")}
                        className="rounded-full border border-line px-3.5 py-1.5 text-[12px] font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                      >
                        Reject
                      </button>
                    )}

                    {/* Delete Button */}
                    <button
                      disabled={actionId === i.id}
                      onClick={() => void deleteReview(i.id)}
                      className="text-[12px] text-ink2 hover:text-rose-700 hover:underline px-2"
                    >
                      Delete
                    </button>
                  </div>

                </div>
              );
            })}

            {items.length === 0 && !loading && (
              <div className="p-12 text-center text-[13px] text-ink2">
                No video review submissions found. Customers can submit YouTube reviews from product detail pages or admins can add them when editing products.
              </div>
            )}

            {loading && (
              <div className="p-12 text-center text-[13px] text-ink2">
                Loading video reviews...
              </div>
            )}
          </div>
        </div>

      </main>
    </>
  );
}
