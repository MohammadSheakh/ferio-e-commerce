"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CatalogProduct, formatTaka, selectVariant } from "@/lib/catalog";
import { useCart } from "@/components/CartContext";
import { trackStorefrontEvent } from "@/lib/storefront-analytics";

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
    () =>
      product.variants.find((item) => item.id === variantId) ??
      product.variants[0],
    [product.variants, variantId],
  );
  const selectedProduct = variant ? selectVariant(product, variant) : product;
  const outOfStock = selectedProduct.availableStock === 0;

  const handleAddToCart = async () => {
    setAddingCart(true);
    setError("");
    try {
      await add(selectedProduct.variantId, qty);
      trackStorefrontEvent({
        type: "ADD_TO_CART",
        productId: product.id,
        variantId: selectedProduct.variantId,
        quantity: qty,
        path: window.location.pathname,
      });
      router.push("/cart");
    } catch (addError) {
      setError(
        addError instanceof Error
          ? addError.message
          : "Unable to add this item.",
      );
      setAddingCart(false);
    }
  };

  const handleBuyNow = async () => {
    setBuyingNow(true);
    setError("");
    try {
      await add(selectedProduct.variantId, qty);
      trackStorefrontEvent({
        type: "ADD_TO_CART",
        productId: product.id,
        variantId: selectedProduct.variantId,
        quantity: qty,
        path: window.location.pathname,
      });
      router.push("/checkout");
    } catch (addError) {
      setError(
        addError instanceof Error
          ? addError.message
          : "Unable to proceed to checkout.",
      );
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
            className="mt-1.5 w-full rounded-card border border-line bg-white px-3.5 py-2.5 text-[14px] text-ink focus:border-ink"
          >
            {product.variants
              .filter((item) => item.isActive)
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} — {formatTaka(item.price)} — {item.availableStock}{" "}
                  available
                </option>
              ))}
          </select>
        </label>
      )}

      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
        <div className="flex shrink-0 items-center justify-between rounded-full border border-line px-1 py-1 sm:justify-start">
          <button
            onClick={() => setQty((value) => Math.max(1, value - 1))}
            className="px-3 py-1.5 text-ink2 hover:text-ink font-bold text-base"
            aria-label="Decrease quantity"
          >
            −
          </button>
          <span className="w-8 text-center text-[13px] font-medium text-ink">
            {qty}
          </span>
          <button
            onClick={() =>
              setQty((value) =>
                Math.min(selectedProduct.availableStock, value + 1),
              )
            }
            className="px-3 py-1.5 text-ink2 hover:text-ink font-bold text-base"
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>

        <button
          disabled={outOfStock || addingCart || buyingNow}
          onClick={handleAddToCart}
          className="flex-1 rounded-full border border-ink bg-transparent px-5 py-3 text-[14px] font-medium text-ink transition hover:bg-surface disabled:cursor-not-allowed disabled:border-line disabled:text-ink2"
        >
          {outOfStock
            ? "Out of stock"
            : addingCart
              ? "Adding..."
              : "Add to cart"}
        </button>

        <button
          disabled={outOfStock || addingCart || buyingNow}
          onClick={handleBuyNow}
          className="flex flex-1 items-center justify-center rounded-full bg-ink px-5 py-3 text-[14px] font-medium text-white transition hover:opacity-85 disabled:cursor-not-allowed disabled:bg-ink/25"
        >
          {outOfStock ? "Out of stock" : buyingNow ? "Redirecting…" : "Buy now"}
        </button>
      </div>

      <div className="flex flex-col items-start justify-between gap-2 border-t border-line pt-4 text-[12px] text-ink2 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={handleCopyUrl}
          className="rounded-full border border-line bg-white px-4 py-1.5 font-medium text-ink transition hover:border-ink"
        >
          {copied ? "Link copied" : "Copy product link"}
        </button>

        <span aria-live="polite" className="text-[11px] text-ink2">
          Share product with friends &amp; family
        </span>
      </div>

      {error && (
        <p role="alert" className="mt-2 text-[12px] text-rose-700">
          {error}
        </p>
      )}
    </div>
  );
}
