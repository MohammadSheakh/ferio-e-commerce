"use client";

import { useState } from "react";
import Link from "next/link";
import { useCart } from "@/components/CartContext";
import { formatTaka } from "@/lib/catalog";

export default function CartPage() {
  const { cart, lines, remove, setQty, subtotal, loading, error, clearError } = useCart();
  const [updatingVariant, setUpdatingVariant] = useState("");
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [cartNameInput, setCartNameInput] = useState("");
  const [savingCart, setSavingCart] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [shareLink, setShareLink] = useState<string | null>(null);

  async function updateQuantity(variantId: string, quantity: number) {
    setUpdatingVariant(variantId);
    clearError();
    try {
      await setQty(variantId, quantity);
    } catch {
      return;
    } finally {
      setUpdatingVariant("");
    }
  }

  async function removeLine(variantId: string) {
    setUpdatingVariant(variantId);
    clearError();
    try {
      await remove(variantId);
    } catch {
      return;
    } finally {
      setUpdatingVariant("");
    }
  }

  async function handleSaveCart(e: React.FormEvent) {
    e.preventDefault();
    setSavingCart(true);
    setNotification(null);
    clearError();
    try {
      const res = await fetch("/api/cart/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: cartNameInput.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to save cart.");
      }
      const saved = data.data || data;
      setNotification(`Cart "${saved.name}" saved successfully!`);
      const link = `${window.location.origin}/cart/share/${saved.shareToken}`;
      setShareLink(link);
      setSaveModalOpen(false);
      setCartNameInput("");
    } catch (err: any) {
      setNotification(null);
      alert(err.message || "Could not save cart.");
    } finally {
      setSavingCart(false);
    }
  }

  async function handleQuickShare() {
    setSavingCart(true);
    setNotification(null);
    clearError();
    try {
      const res = await fetch("/api/cart/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to generate share link.");
      const saved = data.data || data;
      const link = `${window.location.origin}/cart/share/${saved.shareToken}`;
      await navigator.clipboard.writeText(link);
      setNotification("Share link copied to clipboard!");
      setShareLink(link);
    } catch (err: any) {
      alert(err.message || "Could not share cart.");
    } finally {
      setSavingCart(false);
    }
  }

  if (loading) {
    return <main className="mx-auto max-w-4xl px-6 py-28 text-center text-[13px] text-ink2">Loading your cart…</main>;
  }

  if (lines.length === 0) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-28 text-center">
        <h1 className="text-[22px] font-semibold tracking-tight text-ink">Your cart is empty</h1>
        <p className="mt-2 text-[13px] text-ink2">Add a product to keep it here across browser restarts.</p>
        {error && <p role="alert" className="mt-3 text-[12px] text-rose-700">{error}</p>}
        <div className="mt-7 flex justify-center gap-3">
          <Link href="/products" className="rounded-full bg-ink px-7 py-3 text-[14px] font-medium text-white hover:opacity-85">Browse products</Link>
          <Link href="/account/saved-carts" className="rounded-full border border-line px-6 py-3 text-[14px] font-medium text-ink hover:border-ink">View Saved Carts</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-14">
      <h1 className="text-[28px] font-semibold tracking-tight text-ink">Your cart</h1>
      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-4">
        <p className="text-[13px] text-ink2">Prices and availability are checked by Ferio each time this cart loads.</p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSaveModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-4 py-2 text-[12.5px] font-medium text-ink hover:border-ink transition"
          >
            <span>💾</span>
            <span>Save Cart for Later</span>
          </button>
          <button
            onClick={handleQuickShare}
            disabled={savingCart}
            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-4 py-2 text-[12.5px] font-medium text-ink hover:border-ink transition disabled:opacity-50"
          >
            <span>🔗</span>
            <span>{savingCart ? "Sharing…" : "Share Cart"}</span>
          </button>
        </div>
      </div>

      {notification && (
        <div className="mt-6 rounded-card border border-emerald-200 bg-emerald-50 p-4 text-[13px] font-medium text-emerald-800 flex items-center justify-between">
          <div>
            <span>{notification}</span>
            {shareLink && (
              <p className="mt-1 text-[12px] text-emerald-700 select-all font-mono">
                {shareLink}
              </p>
            )}
          </div>
          <button onClick={() => setNotification(null)} className="text-emerald-900 text-[12px] font-bold">Dismiss</button>
        </div>
      )}

      {error && <p role="alert" className="mt-4 text-[13px] text-rose-700">{error}</p>}

      <div className="mt-8 divide-y divide-line border-y border-line">
        {lines.map((line) => {
          const disabled = updatingVariant === line.variantId;
          return (
            <div key={line.variantId} className="py-6">
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 overflow-hidden rounded-card bg-surface">{line.image && <img src={line.image} alt={line.productName} className="h-full w-full object-cover" />}</div>
                <div className="min-w-0 flex-1"><Link href={`/products/${line.slug}`} className="text-[14px] font-medium text-ink hover:underline">{line.productName}</Link><p className="text-[11px] text-ink2">{line.variantName} · {line.sku}{line.condition === "SECOND_HAND" ? ` · second-hand (${line.conditionGrade?.replaceAll("_", " ").toLowerCase()})` : ""}</p><p className="mt-0.5 text-[13px] text-ink2">{formatTaka(line.currentUnitPrice)}</p>{line.addedUnitPrice !== line.currentUnitPrice && <p className="mt-1 text-[11px] text-amber-700">Previously {formatTaka(line.addedUnitPrice)}</p>}</div>
                <div className="flex items-center rounded-full ring-1 ring-line"><button disabled={disabled || line.quantity <= 1} onClick={() => void updateQuantity(line.variantId, line.quantity - 1)} className="px-3 py-1.5 text-ink2 disabled:opacity-30" aria-label="Decrease quantity">−</button><span className="w-6 text-center text-[13px]">{line.quantity}</span><button disabled={disabled || line.quantity >= line.availableStock} onClick={() => void updateQuantity(line.variantId, line.quantity + 1)} className="px-3 py-1.5 text-ink2 disabled:opacity-30" aria-label="Increase quantity">+</button></div>
                <p className="w-24 text-right text-[14px] font-medium text-ink">{formatTaka(line.lineTotal)}</p>
                <button disabled={disabled} onClick={() => void removeLine(line.variantId)} className="text-[12px] text-ink2 underline decoration-line underline-offset-4 disabled:opacity-30">Remove</button>
              </div>
              {line.issues.length > 0 && <div className="ml-24 mt-3 space-y-1">{line.issues.map((issue) => <p key={issue.code} className={`text-[12px] ${issue.severity === "blocking" ? "text-rose-700" : "text-amber-700"}`}>{issue.message}</p>)}</div>}
            </div>
          );
        })}
      </div>

      <div className="ml-auto mt-8 max-w-sm space-y-3 text-[13px]">
        <div className="flex justify-between text-ink2"><span>Estimated subtotal</span><span>{formatTaka(subtotal)}</span></div>
        <p className="border-t border-line pt-3 text-[12px] leading-relaxed text-ink2">Delivery, discounts, and final stock are calculated again during checkout.</p>
        <div className="grid grid-cols-2 gap-2">
          <Link href="/products" className="rounded-full border border-line px-5 py-3 text-center text-[14px] font-medium text-ink hover:border-ink">Continue shopping</Link>
          {cart.isValid ? <Link href="/checkout" className="rounded-full bg-ink px-5 py-3 text-center text-[14px] font-medium text-white hover:opacity-85">Proceed to checkout</Link> : <button disabled className="rounded-full bg-ink/25 px-5 py-3 text-[14px] font-medium text-white">Resolve issues</button>}
        </div>
      </div>

      {/* Save Cart Modal */}
      {saveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-line">
            <h3 className="text-[18px] font-semibold text-ink">Save Cart for Later</h3>
            <p className="mt-1 text-[12.5px] text-ink2">
              Give this cart configuration a memorable name to easily load or re-order anytime.
            </p>
            <form onSubmit={handleSaveCart} className="mt-5 space-y-4">
              <div>
                <label className="block text-[12px] font-medium text-ink2 mb-1.5">
                  Cart Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Monthly Grocery (leave blank for auto-generated name)"
                  value={cartNameInput}
                  onChange={(e) => setCartNameInput(e.target.value)}
                  className="w-full rounded-card border border-line px-4 py-2.5 text-[13.5px] outline-none focus:border-ink"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSaveModalOpen(false)}
                  className="rounded-full border border-line px-4 py-2 text-[13px] font-medium text-ink2 hover:text-ink"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingCart}
                  className="rounded-full bg-ink px-5 py-2 text-[13px] font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  {savingCart ? "Saving…" : "Save Cart"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
