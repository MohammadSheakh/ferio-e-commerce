"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CatalogProduct, formatTaka, selectVariant } from "@/lib/catalog";
import { useCart } from "@/components/CartContext";

export default function AddToCart({ product }: { product: CatalogProduct }) {
  const { add } = useCart();
  const router = useRouter();
  const [variantId, setVariantId] = useState(product.variantId);
  const [qty, setQty] = useState(1);
  const [addingCart, setAddingCart] = useState(false);
  const [buyingNow, setBuyingNow] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const variant = useMemo(
    () => product.variants.find((item) => item.id === variantId) ?? product.variants[0],
    [product.variants, variantId],
  );
  const selectedProduct = variant ? selectVariant(product, variant) : product;
  const outOfStock = selectedProduct.availableStock === 0;

  const handleAddToCart = async () => {
    setAddingCart(true);
    setError("");
    try {
      await add(selectedProduct.variantId, qty);
      router.push("/cart");
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : "Unable to add this item.");
      setAddingCart(false);
    }
  };

  const handleBuyNow = async () => {
    setBuyingNow(true);
    setError("");
    try {
      await add(selectedProduct.variantId, qty);
      router.push("/checkout");
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : "Unable to proceed to checkout.");
      setBuyingNow(false);
    }
  };

  const handleCopyUrl = async () => {
    try {
      const url = window.location.href;
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = url;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setError("Failed to copy URL.");
    }
  };

  return (
    <div className="mt-8 space-y-4">
      {product.variants.length > 1 && (
        <label className="block text-[12px] text-ink2">
          Variant
          <select
            value={variantId}
            onChange={(event) => {
              setVariantId(event.target.value);
              setQty(1);
            }}
            className="mt-1.5 w-full rounded-card border border-line px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-ink"
          >
            {product.variants
              .filter((item) => item.isActive)
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} — {formatTaka(item.price)} — {item.availableStock} available
                </option>
              ))}
          </select>
        </label>
      )}

      {/* Quantity & Buy Action Buttons */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Quantity Selector */}
        <div className="flex items-center justify-between sm:justify-start rounded-full ring-1 ring-line shrink-0 px-1 py-1">
          <button
            onClick={() => setQty((value) => Math.max(1, value - 1))}
            className="px-3 py-1.5 text-ink2 hover:text-ink font-bold text-base"
            aria-label="Decrease quantity"
          >
            −
          </button>
          <span className="w-8 text-center text-[13px] font-medium text-ink">{qty}</span>
          <button
            onClick={() =>
              setQty((value) => Math.min(selectedProduct.availableStock, value + 1))
            }
            className="px-3 py-1.5 text-ink2 hover:text-ink font-bold text-base"
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>

        {/* Add to Cart Button */}
        <button
          disabled={outOfStock || addingCart || buyingNow}
          onClick={handleAddToCart}
          className="flex-1 rounded-full border border-ink bg-transparent px-5 py-3 text-[14px] font-medium text-ink transition hover:bg-surface disabled:cursor-not-allowed disabled:border-line disabled:text-ink2"
        >
          {outOfStock ? "Out of stock" : addingCart ? "Adding..." : "Add to cart"}
        </button>

        {/* Buy Now Button (Direct Checkout) */}
        <button
          disabled={outOfStock || addingCart || buyingNow}
          onClick={handleBuyNow}
          className="flex-1 rounded-full bg-ink px-5 py-3 text-[14px] font-medium text-white transition hover:opacity-85 disabled:cursor-not-allowed disabled:bg-ink/25 flex items-center justify-center gap-1.5"
        >
          <span>⚡</span>
          <span>{outOfStock ? "Out of stock" : buyingNow ? "Redirecting..." : "Buy Now"}</span>
        </button>
      </div>

      {/* Utility Action Bar: Copy Product URL */}
      <div className="pt-2 flex items-center justify-between border-t border-line/60 text-[12px] text-ink2">
        <button
          type="button"
          onClick={handleCopyUrl}
          className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-4 py-1.5 font-medium text-ink hover:bg-ink hover:text-white transition"
        >
          <span>{copied ? "✓" : "🔗"}</span>
          <span>{copied ? "URL Copied! / লিংক কপি হয়েছে!" : "Copy Product Link"}</span>
        </button>

        <span className="text-[11px] text-ink2">
          Share product with friends &amp; family
        </span>
      </div>

      {error && <p role="alert" className="mt-2 text-[12px] text-rose-700">{error}</p>}
    </div>
  );
}
