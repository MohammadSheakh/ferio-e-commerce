"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  CatalogCategory,
  CatalogProduct,
  CatalogVariant,
} from "@/lib/catalog";

type VariantForm = {
  id?: string;
  name: string;
  sku: string;
  price: string;
  compareAtPrice: string;
  initialStock: string;
  lowStockThreshold: string;
  weightGrams: string;
  attributes: string;
  isActive: boolean;
};

type MediaForm = {
  url: string;
  altText: string;
};

const inputClass =
  "mt-1.5 w-full rounded-card border border-line px-3.5 py-2.5 text-[14px] outline-none focus:border-ink";

function variantToForm(variant: CatalogVariant): VariantForm {
  return {
    id: variant.id,
    name: variant.name,
    sku: variant.sku,
    price: String(variant.price / 100),
    compareAtPrice: variant.compareAtPrice
      ? String(variant.compareAtPrice / 100)
      : "",
    initialStock: "0",
    lowStockThreshold: String(variant.inventory[0]?.lowStockThreshold ?? 5),
    weightGrams: variant.weightGrams ? String(variant.weightGrams) : "",
    attributes: variant.attributes
      ? JSON.stringify(variant.attributes, null, 2)
      : "",
    isActive: variant.isActive,
  };
}

function emptyVariant(): VariantForm {
  return {
    name: "Default",
    sku: "",
    price: "",
    compareAtPrice: "",
    initialStock: "0",
    lowStockThreshold: "5",
    weightGrams: "",
    attributes: "",
    isActive: true,
  };
}

export default function ProductForm({
  categories,
  product,
}: {
  categories: CatalogCategory[];
  product?: CatalogProduct;
}) {
  const router = useRouter();
  const [variants, setVariants] = useState<VariantForm[]>(
    product?.variants.map(variantToForm) ?? [emptyVariant()],
  );
  const [media, setMedia] = useState<MediaForm[]>(
    product?.media.map((item) => ({
      url: item.url,
      altText: item.altText ?? "",
    })) ?? [{ url: "", altText: "" }],
  );
  const [saving, setSaving] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const [error, setError] = useState("");

  function updateVariant(index: number, patch: Partial<VariantForm>) {
    setVariants((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    );
  }

  function updateMedia(index: number, patch: Partial<MediaForm>) {
    setMedia((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const form = new FormData(event.currentTarget);

    try {
      const variantPayload = variants.map((variant) => {
        let attributes: Record<string, string> | undefined;
        if (variant.attributes.trim()) {
          const parsed = JSON.parse(variant.attributes) as unknown;
          if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
            throw new Error("Variant attributes must be a JSON object.");
          }
          attributes = parsed as Record<string, string>;
        }
        const compareAtPrice = Number(variant.compareAtPrice);

        return {
          id: variant.id,
          name: variant.name,
          sku: variant.sku,
          price: Math.round(Number(variant.price) * 100),
          compareAtPrice:
            Number.isFinite(compareAtPrice) && compareAtPrice > 0
              ? Math.round(compareAtPrice * 100)
              : undefined,
          initialStock: variant.id ? undefined : Number(variant.initialStock),
          lowStockThreshold: Number(variant.lowStockThreshold),
          weightGrams: variant.weightGrams
            ? Number(variant.weightGrams)
            : undefined,
          attributes,
          isActive: variant.isActive,
        };
      });
      const body = {
        name: String(form.get("name")),
        slug: String(form.get("slug")) || undefined,
        description: String(form.get("description")),
        categoryId: String(form.get("categoryId")),
        brand: String(form.get("brand")) || undefined,
        isFeatured: form.get("isFeatured") === "on",
        codAvailable: form.get("codAvailable") === "on",
        deliveryNote: String(form.get("deliveryNote")) || undefined,
        returnNote: String(form.get("returnNote")) || undefined,
        seoTitle: String(form.get("seoTitle")) || undefined,
        seoDescription: String(form.get("seoDescription")) || undefined,
        variants: variantPayload,
        media: media
          .filter((item) => item.url.trim())
          .map((item, index) => ({
            url: item.url.trim(),
            altText: item.altText.trim() || undefined,
            type: "IMAGE",
            sortOrder: index,
          })),
        ...(product ? {} : { status: String(form.get("status")) }),
      };
      const response = await fetch(
        product ? `/api/catalog/products/${product.id}` : "/api/catalog/products",
        {
          method: product ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(payload.message || "Unable to save product.");
      }
      router.push("/dashboard/products");
      router.refresh();
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Unable to save product.",
      );
      setSaving(false);
    }
  }

  async function changeStatus(status: CatalogProduct["status"]) {
    if (!product) return;
    setStatusSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/catalog/products/${product.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(payload.message || "Unable to change product status.");
      }
      router.refresh();
    } catch (statusError) {
      setError(
        statusError instanceof Error
          ? statusError.message
          : "Unable to change product status.",
      );
    } finally {
      setStatusSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="max-w-5xl space-y-8 p-8">
      {product && (
        <section className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-6">
          <div>
            <p className="text-[11px] uppercase tracking-eyebrow text-ink2">Publication</p>
            <p className="mt-1 text-[14px] text-ink">Current status: {product.status.toLowerCase()}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={statusSaving || product.status === "DRAFT"} onClick={() => changeStatus("DRAFT")} className="rounded-full border border-line px-4 py-2 text-[12px] text-ink2 disabled:opacity-40">Move to draft</button>
            <button type="button" disabled={statusSaving || product.status === "ACTIVE"} onClick={() => changeStatus("ACTIVE")} className="rounded-full bg-ink px-4 py-2 text-[12px] text-white disabled:opacity-40">Publish</button>
            <button type="button" disabled={statusSaving || product.status === "ARCHIVED"} onClick={() => changeStatus("ARCHIVED")} className="rounded-full border border-line px-4 py-2 text-[12px] text-rose-700 disabled:opacity-40">Archive</button>
          </div>
        </section>
      )}

      <section>
        <h2 className="text-[16px] font-medium text-ink">Product information</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="text-[12px] text-ink2">Name<input name="name" required minLength={2} defaultValue={product?.name} className={inputClass} /></label>
          <label className="text-[12px] text-ink2">URL slug<input name="slug" defaultValue={product?.slug} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="generated from name" className={inputClass} /></label>
          <label className="text-[12px] text-ink2">Category<select name="categoryId" required defaultValue={product?.category.id ?? ""} className={inputClass}><option value="">Select category</option>{categories.filter((category) => category.isActive || category.id === product?.category.id).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
          <label className="text-[12px] text-ink2">Brand<input name="brand" defaultValue={product?.brand ?? ""} className={inputClass} /></label>
        </div>
        <label className="mt-4 block text-[12px] text-ink2">Description<textarea name="description" required rows={6} defaultValue={product?.description} className={inputClass} /></label>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="text-[12px] text-ink2">Delivery note<input name="deliveryNote" defaultValue={product?.deliveryNote ?? ""} className={inputClass} /></label>
          <label className="text-[12px] text-ink2">Return note<input name="returnNote" defaultValue={product?.returnNote ?? ""} className={inputClass} /></label>
        </div>
        <div className="mt-4 flex flex-wrap gap-6 text-[13px] text-ink">
          <label className="flex items-center gap-2"><input name="codAvailable" type="checkbox" defaultChecked={product?.codAvailable ?? true} /> Cash on delivery</label>
          <label className="flex items-center gap-2"><input name="isFeatured" type="checkbox" defaultChecked={product?.isFeatured ?? false} /> Featured product</label>
          {!product && <label className="flex items-center gap-2">Initial status<select name="status" defaultValue="DRAFT" className="rounded-card border border-line px-3 py-1.5"><option value="DRAFT">Draft</option><option value="ACTIVE">Published</option></select></label>}
        </div>
      </section>

      <section className="border-t border-line pt-8">
        <div className="flex items-end justify-between gap-4"><div><h2 className="text-[16px] font-medium text-ink">Variants</h2><p className="mt-1 text-[12px] text-ink2">Use one row per sellable SKU. Stock changes for existing SKUs belong in Inventory.</p></div><button type="button" onClick={() => setVariants((current) => [...current, emptyVariant()])} className="rounded-full border border-line px-4 py-2 text-[12px] text-ink">Add variant</button></div>
        <div className="mt-5 space-y-4">
          {variants.map((variant, index) => (
            <div key={variant.id ?? `new-${index}`} className="rounded-card border border-line p-5">
              <div className="grid gap-4 md:grid-cols-3">
                <label className="text-[12px] text-ink2">Variant name<input required value={variant.name} onChange={(event) => updateVariant(index, { name: event.target.value })} className={inputClass} /></label>
                <label className="text-[12px] text-ink2">SKU<input required value={variant.sku} onChange={(event) => updateVariant(index, { sku: event.target.value.toUpperCase() })} pattern="[A-Za-z0-9][A-Za-z0-9._-]*" className={inputClass} /></label>
                <label className="text-[12px] text-ink2">Weight (grams)<input type="number" min="1" value={variant.weightGrams} onChange={(event) => updateVariant(index, { weightGrams: event.target.value })} className={inputClass} /></label>
                <label className="text-[12px] text-ink2">Price (৳)<input required type="number" min="0" step="0.01" value={variant.price} onChange={(event) => updateVariant(index, { price: event.target.value })} className={inputClass} /></label>
                <label className="text-[12px] text-ink2">Compare-at price (৳)<input type="number" min="0" step="0.01" value={variant.compareAtPrice} onChange={(event) => updateVariant(index, { compareAtPrice: event.target.value })} className={inputClass} /></label>
                <label className="text-[12px] text-ink2">Low-stock threshold<input required type="number" min="0" value={variant.lowStockThreshold} onChange={(event) => updateVariant(index, { lowStockThreshold: event.target.value })} className={inputClass} /></label>
                {!variant.id && <label className="text-[12px] text-ink2">Initial stock<input required type="number" min="0" value={variant.initialStock} onChange={(event) => updateVariant(index, { initialStock: event.target.value })} className={inputClass} /></label>}
                <label className="text-[12px] text-ink2 md:col-span-2">Attributes (JSON)<textarea rows={3} value={variant.attributes} onChange={(event) => updateVariant(index, { attributes: event.target.value })} placeholder={'{"size":"M","color":"Black"}'} className={inputClass} /></label>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <label className="flex items-center gap-2 text-[12px] text-ink"><input type="checkbox" checked={variant.isActive} onChange={(event) => updateVariant(index, { isActive: event.target.checked })} /> Active SKU</label>
                {!variant.id && variants.length > 1 && <button type="button" onClick={() => setVariants((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="text-[12px] text-rose-700">Remove new variant</button>}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-line pt-8">
        <div className="flex items-end justify-between"><div><h2 className="text-[16px] font-medium text-ink">Media</h2><p className="mt-1 text-[12px] text-ink2">Ordered image URLs for now. Managed object upload remains a separate infrastructure task.</p></div><button type="button" onClick={() => setMedia((current) => [...current, { url: "", altText: "" }])} className="rounded-full border border-line px-4 py-2 text-[12px] text-ink">Add image</button></div>
        <div className="mt-4 space-y-3">{media.map((item, index) => <div key={`${index}-${item.url}`} className="grid gap-3 md:grid-cols-[1fr_1fr_auto]"><input type="url" value={item.url} onChange={(event) => updateMedia(index, { url: event.target.value })} placeholder="https://…" className={inputClass} /><input value={item.altText} onChange={(event) => updateMedia(index, { altText: event.target.value })} placeholder="Alternative text" className={inputClass} /><button type="button" onClick={() => setMedia((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="mt-1.5 px-3 text-[12px] text-rose-700">Remove</button></div>)}</div>
      </section>

      <section className="border-t border-line pt-8">
        <h2 className="text-[16px] font-medium text-ink">Search presentation</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2"><label className="text-[12px] text-ink2">SEO title<input name="seoTitle" defaultValue={product?.seoTitle ?? ""} className={inputClass} /></label><label className="text-[12px] text-ink2">SEO description<textarea name="seoDescription" rows={3} defaultValue={product?.seoDescription ?? ""} className={inputClass} /></label></div>
      </section>

      {error && <p role="alert" className="text-[13px] text-rose-700">{error}</p>}
      <div className="flex gap-3 border-t border-line pt-6"><button disabled={saving || categories.length === 0} className="rounded-full bg-ink px-6 py-2.5 text-[13px] font-medium text-white disabled:opacity-50">{saving ? "Saving…" : product ? "Save changes" : "Create product"}</button><button type="button" onClick={() => router.back()} className="rounded-full border border-line px-6 py-2.5 text-[13px] text-ink2">Cancel</button></div>
    </form>
  );
}
