"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatTaka } from "@/lib/catalog";
import { useCart } from "@/components/CartContext";

type SharedCartItem = {
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

type SharedCart = {
  id: string;
  name: string;
  shareToken: string;
  userName?: string;
  items: SharedCartItem[];
  subtotal: number;
  itemCount: number;
  createdAt: string;
};

export default function SharedCartPage({
  params,
}: {
  params: { token: string };
}) {
  const { revalidate } = useCart();
  const [cart, setCart] = useState<SharedCart | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [importing, setImporting] = useState(false);
  const [savingAccount, setSavingAccount] = useState(false);
  const [copied, setCopied] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    async function loadSharedCart() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/cart/saved/share/${params.token}`, {
          cache: "no-store",
        });
        const payload = await res.json();
        if (!res.ok) {
          throw new Error(payload.message || "Shared cart not found.");
        }
        setCart(payload.data || payload);
      } catch (err: any) {
        setError(err.message || "Unable to load shared cart.");
      } finally {
        setLoading(false);
      }
    }
    void loadSharedCart();
  }, [params.token]);

  async function handleImportToCart() {
    setImporting(true);
    setNotification(null);
    try {
      const res = await fetch(`/api/cart/saved/share/${params.token}/import`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to import shared cart.");
      }
      await revalidate();
      setNotification(data.summary || "Cart items added to your cart!");
    } catch (err: any) {
      setError(err.message || "Could not import items.");
    } finally {
      setImporting(false);
    }
  }

  async function handleSaveToMyAccount() {
    setSavingAccount(true);
    setNotification(null);
    try {
      const res = await fetch(
        `/api/cart/saved/share/${params.token}/save-to-account`,
        { method: "POST" },
      );
      const data = await res.json();
      if (res.status === 401) {
        window.location.href = `/account/login?next=/cart/share/${params.token}`;
        return;
      }
      if (!res.ok) {
        throw new Error(data.message || "Failed to save cart to account.");
      }
      setNotification("Cart saved to your account! View it in Saved Carts.");
    } catch (err: any) {
      setError(err.message || "Could not save to account.");
    } finally {
      setSavingAccount(false);
    }
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-24 text-center text-[13px] text-ink2">
        Loading shared cart…
      </main>
    );
  }

  if (error || !cart) {
    return (
      <main className="mx-auto max-w-xl px-6 py-24 text-center">
        <h1 className="text-[22px] font-semibold text-ink">Shared Cart Not Found</h1>
        <p className="mt-2 text-[13px] text-ink2">
          {error || "This cart link may have expired or is invalid."}
        </p>
        <Link
          href="/products"
          className="mt-6 inline-block rounded-full bg-ink px-6 py-3 text-[13px] text-white"
        >
          Browse Products
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-14">
      {/* Header Banner */}
      <div className="rounded-2xl bg-surface p-6 sm:p-8 border border-line">
        <span className="text-[11px] uppercase tracking-eyebrow text-ink2 font-semibold">
          Shared Shopping Cart
        </span>
        <h1 className="mt-1 text-[28px] font-bold text-ink">{cart.name}</h1>
        {cart.userName && (
          <p className="mt-1 text-[13px] text-ink2">
            Shared by <span className="font-semibold text-ink">{cart.userName}</span>
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            onClick={handleImportToCart}
            disabled={importing}
            className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-[13.5px] font-semibold text-white hover:opacity-90 disabled:opacity-50 transition"
          >
            <span>🛒</span>
            <span>{importing ? "Adding to Cart…" : "Add All Items to My Cart"}</span>
          </button>

          <button
            onClick={handleSaveToMyAccount}
            disabled={savingAccount}
            className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-5 py-3 text-[13.5px] font-semibold text-ink hover:border-ink transition"
          >
            <span>💾</span>
            <span>{savingAccount ? "Saving…" : "Save to My Saved Carts"}</span>
          </button>

          <button
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-4 py-3 text-[13.5px] text-ink2 hover:text-ink"
          >
            <span>🔗</span>
            <span>{copied ? "Copied!" : "Copy Link"}</span>
          </button>
        </div>
      </div>

      {notification && (
        <div className="mt-6 rounded-card border border-emerald-200 bg-emerald-50 p-4 text-[13px] font-medium text-emerald-800 flex items-center justify-between">
          <span>{notification}</span>
          <Link href="/cart" className="underline font-semibold ml-4">
            View My Cart →
          </Link>
        </div>
      )}

      {/* Cart Items Table */}
      <div className="mt-8">
        <h2 className="text-[18px] font-semibold text-ink">
          Cart Content ({cart.itemCount} {cart.itemCount === 1 ? "item" : "items"})
        </h2>

        <div className="mt-4 divide-y divide-line border-y border-line">
          {cart.items.map((item) => (
            <div key={item.id} className="py-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-card bg-surface">
                  {item.image ? (
                    <img src={item.image} alt={item.productName} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[10px] text-ink2">No img</div>
                  )}
                </div>
                <div className="min-w-0">
                  <Link href={`/products/${item.slug}`} className="text-[14px] font-semibold text-ink hover:underline">
                    {item.productName}
                  </Link>
                  <p className="text-[12px] text-ink2 mt-0.5">
                    {item.variantName} · Quantity: {item.quantity}
                  </p>
                  <p className="text-[12px] font-medium text-ink mt-1">
                    {formatTaka(item.price)} each
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span
                  className={`inline-block rounded-full px-3 py-1 text-[11px] font-medium ${
                    item.isAvailable
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-rose-100 text-rose-800"
                  }`}
                >
                  {item.isAvailable ? "In Stock" : "Out of Stock"}
                </span>
                <p className="mt-2 text-[15px] font-bold text-ink">
                  {formatTaka(item.price * item.quantity)}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Subtotal */}
        <div className="mt-6 flex items-center justify-between rounded-2xl bg-paper p-5 border border-line">
          <div>
            <p className="text-[12px] uppercase tracking-eyebrow text-ink2">Total Subtotal</p>
            <p className="text-[20px] font-bold text-ink">{formatTaka(cart.subtotal)}</p>
          </div>
          <button
            onClick={handleImportToCart}
            disabled={importing}
            className="rounded-full bg-ink px-6 py-3 text-[13.5px] font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            {importing ? "Adding to Cart…" : "Add All to Cart"}
          </button>
        </div>
      </div>
    </main>
  );
}
