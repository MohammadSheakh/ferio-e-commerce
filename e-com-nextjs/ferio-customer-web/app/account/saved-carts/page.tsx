"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatTaka } from "@/lib/catalog";
import { useCart } from "@/components/CartContext";

type SavedCartItem = {
  id: string;
  variantId: string;
  productId: string;
  slug: string;
  productName: string;
  variantName: string;
  price: number;
  image: string | null;
  quantity: number;
  availableStock: number;
  isAvailable: boolean;
};

type SavedCart = {
  id: string;
  name: string;
  shareToken: string;
  userId: string | null;
  userName?: string;
  items: SavedCartItem[];
  subtotal: number;
  itemCount: number;
  createdAt: string;
};

export default function SavedCartsPage() {
  const { revalidate } = useCart();
  const [savedCarts, setSavedCarts] = useState<SavedCart[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  async function fetchSavedCarts() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/cart/saved", { cache: "no-store" });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.message || "Failed to load saved carts.");
      }
      setSavedCarts(payload.data || payload || []);
    } catch (err: any) {
      setError(err.message || "Unable to load saved carts.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchSavedCarts();
  }, []);

  async function handleLoadIntoCart(shareToken: string) {
    setActionLoading(shareToken);
    setNotification(null);
    try {
      const res = await fetch(`/api/cart/saved/share/${shareToken}/import`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to load saved cart.");
      }
      await revalidate();
      setNotification(data.summary || "Cart items imported successfully!");
    } catch (err: any) {
      setError(err.message || "Could not import cart items.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDeleteSavedCart(id: string) {
    if (!confirm("Are you sure you want to delete this saved cart?")) return;
    setActionLoading(id);
    try {
      const res = await fetch(`/api/cart/saved/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to delete saved cart.");
      }
      setSavedCarts((prev) => prev.filter((c) => c.id !== id));
      setNotification("Saved cart removed.");
    } catch (err: any) {
      setError(err.message || "Could not delete cart.");
    } finally {
      setActionLoading(null);
    }
  }

  function handleCopyShareLink(shareToken: string) {
    const url = `${window.location.origin}/cart/share/${shareToken}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(shareToken);
    setTimeout(() => setCopiedToken(null), 3000);
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-24 text-center text-[13px] text-ink2">
        Loading your saved carts…
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-14">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-6">
        <div>
          <p className="text-[11px] uppercase tracking-eyebrow text-ink2">Customer account</p>
          <h1 className="mt-1 text-[28px] font-semibold tracking-tight text-ink">Saved Carts</h1>
          <p className="mt-1 text-[13px] text-ink2">
            Store and retrieve carts with custom names, or share links with friends and family.
          </p>
        </div>
        <Link
          href="/cart"
          className="rounded-full border border-line bg-white px-5 py-2.5 text-[13px] font-medium text-ink hover:border-ink"
        >
          🛒 View Active Cart
        </Link>
      </div>

      {notification && (
        <div className="mt-6 rounded-card border border-emerald-200 bg-emerald-50/80 p-4 text-[13px] font-medium text-emerald-800 flex items-center justify-between">
          <span>{notification}</span>
          <Link href="/cart" className="underline font-semibold ml-4">Go to Cart →</Link>
        </div>
      )}

      {error && (
        <div className="mt-6 rounded-card border border-rose-200 bg-rose-50 p-4 text-[13px] text-rose-700">
          {error}
        </div>
      )}

      {savedCarts.length === 0 ? (
        <div className="mt-16 text-center py-16 border-y border-line">
          <h2 className="text-[18px] font-semibold text-ink">No saved carts yet</h2>
          <p className="mt-2 text-[13px] text-ink2 max-w-md mx-auto">
            You can give your current active cart a custom name and save it for future re-ordering or sharing.
          </p>
          <Link
            href="/cart"
            className="mt-6 inline-block rounded-full bg-ink px-6 py-3 text-[13px] font-medium text-white hover:opacity-90"
          >
            Go to Cart & Save
          </Link>
        </div>
      ) : (
        <div className="mt-8 space-y-6">
          {savedCarts.map((sc) => (
            <div
              key={sc.id}
              className="rounded-2xl border border-line bg-white p-6 shadow-xs transition hover:shadow-md"
            >
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line/60 pb-4">
                <div>
                  <h2 className="text-[18px] font-semibold text-ink">{sc.name}</h2>
                  <p className="mt-1 text-[12px] text-ink2">
                    Saved on {new Date(sc.createdAt).toLocaleDateString("en-BD", { month: "short", day: "numeric", year: "numeric" })} · {sc.itemCount} {sc.itemCount === 1 ? "item" : "items"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handleLoadIntoCart(sc.shareToken)}
                    disabled={actionLoading === sc.shareToken}
                    className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-[12.5px] font-medium text-white hover:opacity-85 disabled:opacity-50"
                  >
                    <span>🛒</span>
                    <span>{actionLoading === sc.shareToken ? "Loading…" : "Load into Cart"}</span>
                  </button>
                  <button
                    onClick={() => handleCopyShareLink(sc.shareToken)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3.5 py-2 text-[12.5px] font-medium text-ink hover:border-ink"
                  >
                    <span>🔗</span>
                    <span>{copiedToken === sc.shareToken ? "Copied Link!" : "Share Link"}</span>
                  </button>
                  <button
                    onClick={() => handleDeleteSavedCart(sc.id)}
                    disabled={actionLoading === sc.id}
                    className="inline-flex items-center gap-1 rounded-full border border-line/60 bg-surface px-3.5 py-2 text-[12.5px] text-ink2 hover:border-rose-400 hover:text-rose-600"
                  >
                    <span>🗑️</span>
                  </button>
                </div>
              </div>

              {/* Items List */}
              <div className="mt-4 divide-y divide-line/40">
                {sc.items.map((item) => (
                  <div key={item.id} className="py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-surface">
                        {item.image ? (
                          <img src={item.image} alt={item.productName} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-[10px] text-ink2">No img</div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-ink truncate">{item.productName}</p>
                        <p className="text-[11px] text-ink2">
                          {item.variantName} · Qty {item.quantity} · {formatTaka(item.price)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-[10.5px] font-medium ${
                          item.isAvailable
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {item.isAvailable ? "In Stock" : "Unavailable"}
                      </span>
                      <p className="mt-1 text-[13px] font-semibold text-ink">
                        {formatTaka(item.price * item.quantity)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-3 border-t border-line/60 flex justify-between items-center text-[13px]">
                <span className="text-ink2 font-medium">Cart Total</span>
                <span className="text-[15px] font-bold text-ink">{formatTaka(sc.subtotal)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
