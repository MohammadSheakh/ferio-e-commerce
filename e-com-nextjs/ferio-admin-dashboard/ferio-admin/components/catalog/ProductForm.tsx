"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import BrandCombobox from "./BrandCombobox";
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

type YoutubeReviewForm = {
  youtubeUrl: string;
  title: string;
  reviewerName: string;
  isFeatured: boolean;
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
  const [youtubeReviews, setYoutubeReviews] = useState<YoutubeReviewForm[]>(
    product?.youtubeReviews?.map((item) => ({
      youtubeUrl: item.youtubeUrl,
      title: item.title ?? "",
      reviewerName: item.reviewerName ?? "",
      isFeatured: item.isFeatured ?? false,
    })) ?? []
  );

  const [saving, setSaving] = useState(false);
  const [condition, setCondition] = useState<CatalogProduct["condition"]>(
    product?.condition ?? "NEW",
  );
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

  function addYoutubeReview() {
    setYoutubeReviews((current) => [
      ...current,
      { youtubeUrl: "", title: "", reviewerName: "", isFeatured: current.length === 0 },
    ]);
  }

  function updateYoutubeReview(index: number, patch: Partial<YoutubeReviewForm>) {
    setYoutubeReviews((current) =>
      current.map((item, itemIndex) => {
        if (itemIndex === index) {
          const next = { ...item, ...patch };
          return next;
        }
        return patch.isFeatured ? { ...item, isFeatured: false } : item;
      })
    );
  }

  function removeYoutubeReview(index: number) {
    setYoutubeReviews((current) => current.filter((_, i) => i !== index));
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
        brandId: String(form.get("brandId")) || undefined,
        isFeatured: form.get("isFeatured") === "on",
        codAvailable: form.get("codAvailable") === "on",
        deliveryNote: String(form.get("deliveryNote")) || undefined,
        returnNote: String(form.get("returnNote")) || undefined,
        condition,
        conditionGrade:
          condition === "SECOND_HAND"
            ? String(form.get("conditionGrade"))
            : undefined,
        conditionNote:
          condition === "SECOND_HAND"
            ? String(form.get("conditionNote"))
            : undefined,
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
        youtubeReviews: youtubeReviews
          .filter((item) => item.youtubeUrl.trim())
          .map((item) => ({
            youtubeUrl: item.youtubeUrl.trim(),
            title: item.title.trim() || undefined,
            reviewerName: item.reviewerName.trim() || undefined,
            isFeatured: item.isFeatured,
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
        throw new Error(payload.message || "Unable to change status.");
      }
      router.refresh();
    } catch (statusError) {
      setError(
        statusError instanceof Error
          ? statusError.message
          : "Unable to change status.",
      );
    } finally {
      setStatusSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-8 p-8 max-w-5xl">
      {product && (
        <div className="flex items-center justify-between rounded-card border border-line p-5">
          <div>
            <p className="text-[12px] uppercase tracking-eyebrow text-ink2">Status</p>
            <p className="text-[16px] font-medium text-ink">{product.status}</p>
          </div>
          <div className="flex gap-2">
            {product.status !== "ACTIVE" && (
              <button
                type="button"
                disabled={statusSaving}
                onClick={() => void changeStatus("ACTIVE")}
                className="rounded-full bg-ink px-4 py-2 text-[13px] font-medium text-white disabled:opacity-50"
              >
                Publish product
              </button>
            )}
            {product.status !== "DRAFT" && (
              <button
                type="button"
                disabled={statusSaving}
                onClick={() => void changeStatus("DRAFT")}
                className="rounded-full border border-line px-4 py-2 text-[13px] text-ink disabled:opacity-50"
              >
                Move to draft
              </button>
            )}
            {product.status !== "ARCHIVED" && (
              <button
                type="button"
                disabled={statusSaving}
                onClick={() => void changeStatus("ARCHIVED")}
                className="rounded-full border border-line px-4 py-2 text-[13px] text-rose-700 disabled:opacity-50"
              >
                Archive
              </button>
            )}
          </div>
        </div>
      )}

      <div className="space-y-4 rounded-card border border-line p-5">
        <h2 className="text-[16px] font-medium text-ink">Basic Info</h2>

        <div>
          <label className="block text-[12px] text-ink2">Product Name</label>
          <input
            required
            name="name"
            defaultValue={product?.name}
            className={inputClass}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-[12px] text-ink2">Category</label>
            <select
              required
              name="categoryId"
              defaultValue={product?.category.id}
              className={inputClass}
            >
              <option value="">Select category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[12px] text-ink2">Brand</label>
            <BrandCombobox
              initialBrandName={product?.brandRel?.name || product?.brand || ""}
              initialBrandId={product?.brandId || ""}
            />
          </div>
        </div>

        <div>
          <label className="block text-[12px] text-ink2">Slug (optional)</label>
          <input
            name="slug"
            defaultValue={product?.slug}
            placeholder="auto-generated"
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-[12px] text-ink2">Description</label>
          <textarea
            required
            name="description"
            rows={5}
            defaultValue={product?.description}
            className={inputClass}
          />
        </div>
      </div>

      <div className="space-y-4 rounded-card border border-line p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[16px] font-medium text-ink">Media Images</h2>
            <p className="mt-1 text-[12px] text-ink2">
              Add image URLs for this product. The first image will be used as primary preview.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMedia((m) => [...m, { url: "", altText: "" }])}
            className="rounded-full border border-line px-3 py-1.5 text-[12px] text-ink hover:bg-neutral-50"
          >
            + Add image URL
          </button>
        </div>

        {media.map((item, index) => (
          <div key={index} className="grid gap-3 sm:grid-cols-[2fr_1fr_auto] items-center">
            <div>
              <label className="block text-[11px] text-ink2">Image URL {index === 0 ? "(Primary)" : ""}</label>
              <input
                type="url"
                placeholder="https://..."
                value={item.url}
                onChange={(e) => updateMedia(index, { url: e.target.value })}
                className="mt-1 w-full rounded-card border border-line px-3.5 py-2 text-[13px] outline-none focus:border-ink"
              />
            </div>
            <div>
              <label className="block text-[11px] text-ink2">Alt text</label>
              <input
                type="text"
                placeholder="Description"
                value={item.altText}
                onChange={(e) => updateMedia(index, { altText: e.target.value })}
                className="mt-1 w-full rounded-card border border-line px-3.5 py-2 text-[13px] outline-none focus:border-ink"
              />
            </div>
            {media.length > 1 && (
              <button
                type="button"
                onClick={() => setMedia((m) => m.filter((_, i) => i !== index))}
                className="mt-5 text-[12px] text-rose-600 hover:underline"
              >
                Remove
              </button>
            )}
          </div>
        ))}
      </div>

      {/* YouTube Video Reviews */}
      <div className="space-y-4 rounded-card border border-line p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[16px] font-medium text-ink">YouTube Video Reviews</h2>
            <p className="mt-1 text-[12px] text-ink2">
              Add video review links for this product. Check &quot;Featured&quot; to highlight a video review on the storefront.
            </p>
          </div>
          <button
            type="button"
            onClick={addYoutubeReview}
            className="rounded-full border border-line px-3 py-1.5 text-[12px] text-ink hover:bg-neutral-50"
          >
            + Add YouTube Video
          </button>
        </div>

        {youtubeReviews.map((item, index) => (
          <div key={index} className="grid gap-3 rounded-card border border-line/60 bg-neutral-50/50 p-4 sm:grid-cols-[2fr_1fr_1fr_auto_auto] items-center">
            <div>
              <label className="block text-[11px] text-ink2">YouTube URL *</label>
              <input
                type="url"
                required
                placeholder="https://youtube.com/watch?v=..."
                value={item.youtubeUrl}
                onChange={(e) => updateYoutubeReview(index, { youtubeUrl: e.target.value })}
                className="mt-1 w-full rounded-card border border-line px-3.5 py-2 text-[13px] outline-none focus:border-ink bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] text-ink2">Title</label>
              <input
                type="text"
                placeholder="Unboxing & Review"
                value={item.title}
                onChange={(e) => updateYoutubeReview(index, { title: e.target.value })}
                className="mt-1 w-full rounded-card border border-line px-3.5 py-2 text-[13px] outline-none focus:border-ink bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] text-ink2">Reviewer Name</label>
              <input
                type="text"
                placeholder="Reviewer name"
                value={item.reviewerName}
                onChange={(e) => updateYoutubeReview(index, { reviewerName: e.target.value })}
                className="mt-1 w-full rounded-card border border-line px-3.5 py-2 text-[13px] outline-none focus:border-ink bg-white"
              />
            </div>
            <div className="flex items-center gap-1.5 pt-5">
              <input
                type="checkbox"
                id={`yt-feat-${index}`}
                checked={item.isFeatured}
                onChange={(e) => updateYoutubeReview(index, { isFeatured: e.target.checked })}
                className="h-4 w-4 rounded border-line"
              />
              <label htmlFor={`yt-feat-${index}`} className="text-[12px] font-medium text-ink cursor-pointer">
                Featured
              </label>
            </div>
            <div className="pt-5">
              <button
                type="button"
                onClick={() => removeYoutubeReview(index)}
                className="text-[12px] text-rose-600 hover:underline"
              >
                Remove
              </button>
            </div>
          </div>
        ))}

        {youtubeReviews.length === 0 && (
          <p className="text-[12px] text-ink2 italic">No YouTube reviews added yet for this product.</p>
        )}
      </div>

      <div className="space-y-4 rounded-card border border-line p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-[16px] font-medium text-ink">Variants</h2>
          <button
            type="button"
            onClick={() => setVariants((v) => [...v, emptyVariant()])}
            className="rounded-full border border-line px-3 py-1.5 text-[12px] text-ink hover:bg-neutral-50"
          >
            + Add variant
          </button>
        </div>

        {variants.map((variant, index) => (
          <div
            key={index}
            className="space-y-3 rounded-card border border-line/60 p-4 bg-neutral-50/50"
          >
            <div className="flex items-center justify-between border-b border-line/40 pb-2">
              <p className="text-[13px] font-medium text-ink">
                Variant #{index + 1}
              </p>
              {variants.length > 1 && (
                <button
                  type="button"
                  onClick={() => setVariants((v) => v.filter((_, i) => i !== index))}
                  className="text-[12px] text-rose-600 hover:underline"
                >
                  Delete variant
                </button>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="block text-[11px] text-ink2">Variant Name</label>
                <input
                  required
                  value={variant.name}
                  onChange={(e) => updateVariant(index, { name: e.target.value })}
                  className="mt-1 w-full rounded-card border border-line px-3 py-2 text-[13px] outline-none focus:border-ink bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] text-ink2">SKU</label>
                <input
                  required
                  value={variant.sku}
                  onChange={(e) => updateVariant(index, { sku: e.target.value })}
                  className="mt-1 w-full rounded-card border border-line px-3 py-2 text-[13px] outline-none focus:border-ink bg-white uppercase"
                />
              </div>

              <div>
                <label className="block text-[11px] text-ink2">Price ($)</label>
                <input
                  required
                  type="number"
                  step="0.01"
                  min="0"
                  value={variant.price}
                  onChange={(e) => updateVariant(index, { price: e.target.value })}
                  className="mt-1 w-full rounded-card border border-line px-3 py-2 text-[13px] outline-none focus:border-ink bg-white"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="block text-[11px] text-ink2">Compare-at Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={variant.compareAtPrice}
                  onChange={(e) =>
                    updateVariant(index, { compareAtPrice: e.target.value })
                  }
                  className="mt-1 w-full rounded-card border border-line px-3 py-2 text-[13px] outline-none focus:border-ink bg-white"
                />
              </div>

              {!product && (
                <div>
                  <label className="block text-[11px] text-ink2">Initial Stock</label>
                  <input
                    type="number"
                    min="0"
                    value={variant.initialStock}
                    onChange={(e) =>
                      updateVariant(index, { initialStock: e.target.value })
                    }
                    className="mt-1 w-full rounded-card border border-line px-3 py-2 text-[13px] outline-none focus:border-ink bg-white"
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] text-ink2">Low Stock Threshold</label>
                <input
                  type="number"
                  min="0"
                  value={variant.lowStockThreshold}
                  onChange={(e) =>
                    updateVariant(index, { lowStockThreshold: e.target.value })
                  }
                  className="mt-1 w-full rounded-card border border-line px-3 py-2 text-[13px] outline-none focus:border-ink bg-white"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-4 rounded-card border border-line p-5">
        <h2 className="text-[16px] font-medium text-ink">Options & Delivery</h2>

        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-[13px] text-ink">
            <input
              type="checkbox"
              name="isFeatured"
              defaultChecked={product?.isFeatured}
            />
            Featured product on homepage
          </label>

          <label className="flex items-center gap-2 text-[13px] text-ink">
            <input
              type="checkbox"
              name="codAvailable"
              defaultChecked={product?.codAvailable ?? true}
            />
            COD Available
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-[12px] text-ink2">Delivery Note</label>
            <input
              name="deliveryNote"
              defaultValue={product?.deliveryNote ?? ""}
              placeholder="e.g. Ships in 1-2 business days"
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-[12px] text-ink2">Return Note</label>
            <input
              name="returnNote"
              defaultValue={product?.returnNote ?? ""}
              placeholder="e.g. 7 days return policy"
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className="block text-[12px] text-ink2">Item Condition</label>
          <select
            value={condition}
            onChange={(e) => setCondition(e.target.value as CatalogProduct["condition"])}
            className={inputClass}
          >
            <option value="NEW">NEW (Brand New)</option>
            <option value="SECOND_HAND">SECOND_HAND (Pre-owned)</option>
          </select>
        </div>

        {condition === "SECOND_HAND" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-[12px] text-ink2">Condition Grade</label>
              <select
                name="conditionGrade"
                defaultValue={product?.conditionGrade ?? "LIKE_NEW"}
                className={inputClass}
              >
                <option value="LIKE_NEW">LIKE_NEW</option>
                <option value="GOOD">GOOD</option>
                <option value="FAIR">FAIR</option>
              </select>
            </div>

            <div>
              <label className="block text-[12px] text-ink2">Condition Note</label>
              <input
                name="conditionNote"
                defaultValue={product?.conditionNote ?? ""}
                placeholder="Details about wear, scratches, etc."
                className={inputClass}
              />
            </div>
          </div>
        )}

        {!product && (
          <div>
            <label className="block text-[12px] text-ink2">Publish Status</label>
            <select name="status" defaultValue="DRAFT" className={inputClass}>
              <option value="DRAFT">DRAFT (Hidden)</option>
              <option value="ACTIVE">ACTIVE (Published)</option>
              <option value="ARCHIVED">ARCHIVED</option>
            </select>
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="text-[13px] text-rose-700 font-medium">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <button
          disabled={saving}
          className="rounded-full bg-ink px-6 py-2.5 text-[14px] font-medium text-white disabled:opacity-50 shadow-sm"
        >
          {saving ? "Saving…" : product ? "Update product" : "Create product"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-full border border-line px-5 py-2.5 text-[14px] text-ink2 hover:bg-neutral-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
