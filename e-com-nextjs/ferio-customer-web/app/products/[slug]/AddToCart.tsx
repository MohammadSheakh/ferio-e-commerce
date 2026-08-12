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
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const variant = useMemo(
    () => product.variants.find((item) => item.id === variantId) ?? product.variants[0],
    [product.variants, variantId],
  );
  const selectedProduct = variant ? selectVariant(product, variant) : product;
  const outOfStock = selectedProduct.availableStock === 0;

  return (
    <div className="mt-8">
      {product.variants.length > 1 && (
        <label className="mb-4 block text-[12px] text-ink2">
          Variant
          <select value={variantId} onChange={(event) => { setVariantId(event.target.value); setQty(1); }} className="mt-1.5 w-full rounded-card border border-line px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-ink">
            {product.variants.filter((item) => item.isActive).map((item) => <option key={item.id} value={item.id}>{item.name} — {formatTaka(item.price)} — {item.availableStock} available</option>)}
          </select>
        </label>
      )}
      <div className="flex items-center gap-3">
        <div className="flex items-center rounded-full ring-1 ring-line">
          <button onClick={() => setQty((value) => Math.max(1, value - 1))} className="px-3.5 py-2 text-ink2 hover:text-ink" aria-label="Decrease quantity">−</button>
          <span className="w-6 text-center text-[13px]">{qty}</span>
          <button onClick={() => setQty((value) => Math.min(selectedProduct.availableStock, value + 1))} className="px-3.5 py-2 text-ink2 hover:text-ink" aria-label="Increase quantity">+</button>
        </div>
        <button disabled={outOfStock || adding} onClick={async () => { setAdding(true); setError(""); try { await add(selectedProduct.variantId, qty); router.push("/cart"); } catch (addError) { setError(addError instanceof Error ? addError.message : "Unable to add this item."); setAdding(false); } }} className="flex-1 rounded-full bg-ink px-7 py-3 text-[14px] font-medium text-white transition hover:opacity-85 disabled:cursor-not-allowed disabled:bg-ink/25">{outOfStock ? "Out of stock" : adding ? "Adding…" : "Add to cart"}</button>
      </div>
      {error && <p role="alert" className="mt-3 text-[12px] text-rose-700">{error}</p>}
    </div>
  );
}
