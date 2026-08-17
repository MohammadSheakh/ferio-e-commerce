"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Topbar from "@/components/Topbar";
import type { CatalogCategory, CatalogBrand } from "@/lib/catalog";
import Link from "next/link";

type CategoryForm = {
  id?: string;
  name: string;
  slug: string;
  description: string;
  parentId: string;
  sortOrder: string;
  isActive: boolean;
};

const emptyForm: CategoryForm = {
  name: "",
  slug: "",
  description: "",
  parentId: "",
  sortOrder: "0",
  isActive: true,
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [form, setForm] = useState<CategoryForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [error, setError] = useState("");

  // Category Brands Modal
  const [viewingBrandsCategory, setViewingBrandsCategory] = useState<CatalogCategory | null>(null);
  const [categoryBrands, setCategoryBrands] = useState<CatalogBrand[]>([]);
  const [loadingCategoryBrands, setLoadingCategoryBrands] = useState(false);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/catalog/categories", { cache: "no-store" });
      const payload = (await response.json()) as { data?: CatalogCategory[]; message?: string };
      if (!response.ok || !payload.data) throw new Error(payload.message || "Unable to load categories.");
      setCategories(payload.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load categories.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  async function saveCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch(
        form.id ? `/api/catalog/categories/${form.id}` : "/api/catalog/categories",
        {
          method: form.id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name,
            slug: form.slug || undefined,
            description: form.description || undefined,
            parentId: form.parentId || (form.id ? null : undefined),
            sortOrder: Number(form.sortOrder),
            isActive: form.isActive,
          }),
        },
      );
      const payload = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(payload.message || "Unable to save category.");
      setForm(emptyForm);
      await loadCategories();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save category.");
    } finally {
      setSaving(false);
    }
  }

  function editCategory(category: CatalogCategory) {
    setForm({
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description ?? "",
      parentId: category.parentId ?? "",
      sortOrder: String(category.sortOrder),
      isActive: category.isActive,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteCategory(category: CatalogCategory) {
    if (!window.confirm(`Delete “${category.name}”? This cannot be undone.`)) return;
    setDeletingId(category.id);
    setError("");
    try {
      const response = await fetch(`/api/catalog/categories/${category.id}`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(payload.message || "Unable to delete category.");
      }
      if (form.id === category.id) setForm(emptyForm);
      await loadCategories();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Unable to delete category.",
      );
    } finally {
      setDeletingId("");
    }
  }

  async function openCategoryBrandsModal(category: CatalogCategory) {
    setViewingBrandsCategory(category);
    setCategoryBrands([]);
    setLoadingCategoryBrands(true);
    try {
      const res = await fetch(`/api/catalog/brands?categoryId=${category.id}`);
      if (res.ok) {
        const body = (await res.json()) as { data?: CatalogBrand[] };
        if (body.data) setCategoryBrands(body.data);
      }
    } catch {
      // Ignore error
    } finally {
      setLoadingCategoryBrands(false);
    }
  }

  return (
    <>
      <Topbar title="Categories" subtitle="Organize the storefront catalog" />
      <div className="grid gap-8 p-8 lg:grid-cols-[360px_1fr]">
        <form onSubmit={saveCategory} className="h-fit space-y-4 rounded-card border border-line p-5">
          <div>
            <h2 className="text-[16px] font-medium text-ink">{form.id ? "Edit category" : "Add category"}</h2>
            <p className="mt-1 text-[12px] text-ink2">Inactive categories are hidden from the storefront.</p>
          </div>
          <label className="block text-[12px] text-ink2">Name<input required minLength={2} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} className="mt-1.5 w-full rounded-card border border-line px-3.5 py-2.5 text-[14px] outline-none focus:border-ink" /></label>
          <label className="block text-[12px] text-ink2">URL slug<input value={form.slug} onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="generated from name" className="mt-1.5 w-full rounded-card border border-line px-3.5 py-2.5 text-[14px] outline-none focus:border-ink" /></label>
          <label className="block text-[12px] text-ink2">Description<textarea rows={3} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} className="mt-1.5 w-full rounded-card border border-line px-3.5 py-2.5 text-[14px] outline-none focus:border-ink" /></label>
          <label className="block text-[12px] text-ink2">Parent category<select value={form.parentId} onChange={(event) => setForm((current) => ({ ...current, parentId: event.target.value }))} className="mt-1.5 w-full rounded-card border border-line px-3.5 py-2.5 text-[14px] outline-none focus:border-ink"><option value="">No parent</option>{categories.filter((category) => category.id !== form.id).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
          <label className="block text-[12px] text-ink2">Sort order<input type="number" min="0" value={form.sortOrder} onChange={(event) => setForm((current) => ({ ...current, sortOrder: event.target.value }))} className="mt-1.5 w-full rounded-card border border-line px-3.5 py-2.5 text-[14px] outline-none focus:border-ink" /></label>
          <label className="flex items-center gap-2 text-[13px] text-ink"><input type="checkbox" checked={form.isActive} onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))} /> Active category</label>
          {error && <p role="alert" className="text-[12px] text-rose-700">{error}</p>}
          <div className="flex gap-2"><button disabled={saving} className="rounded-full bg-ink px-5 py-2.5 text-[13px] font-medium text-white disabled:opacity-50">{saving ? "Saving…" : form.id ? "Save changes" : "Create category"}</button>{form.id && <button type="button" onClick={() => setForm(emptyForm)} className="rounded-full border border-line px-4 py-2.5 text-[13px] text-ink2">Cancel</button>}</div>
        </form>

        <div className="overflow-hidden rounded-card border border-line bg-white shadow-sm">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[11px] uppercase tracking-eyebrow text-ink2 border-b border-line bg-neutral-50">
                <th className="px-5 py-3 font-normal">Category</th>
                <th className="px-5 py-3 font-normal">Products</th>
                <th className="px-5 py-3 font-normal">Order</th>
                <th className="px-5 py-3 font-normal">Status</th>
                <th className="px-5 py-3 font-normal text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {categories.map((category) => (
                <tr key={category.id} className="text-[13px] hover:bg-neutral-50/50">
                  <td className="px-5 py-3.5">
                    <p className="text-ink font-medium">{category.name}</p>
                    <p className="text-[11px] text-ink2">/{category.slug}</p>
                  </td>
                  <td className="px-5 py-3.5 text-ink">
                    <Link
                      href={`/dashboard/products?category=${category.slug}`}
                      className="font-semibold underline hover:text-ink2"
                    >
                      {category._count.products} products
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 text-ink2">{category.sortOrder}</td>
                  <td className="px-5 py-3.5">
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${category.isActive ? "bg-emerald-100 text-emerald-800" : "bg-surface text-ink2"}`}>
                      {category.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex justify-end items-center gap-3">
                      <button
                        type="button"
                        onClick={() => openCategoryBrandsModal(category)}
                        className="text-[12px] font-medium text-emerald-700 underline underline-offset-2 hover:text-emerald-900"
                      >
                        View Brands
                      </button>
                      <button
                        type="button"
                        onClick={() => editCategory(category)}
                        className="text-[12px] text-ink2 underline underline-offset-2 hover:text-ink"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={deletingId === category.id}
                        onClick={() => void deleteCategory(category)}
                        className="text-[12px] text-rose-700 underline underline-offset-2 disabled:opacity-40"
                      >
                        {deletingId === category.id ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && categories.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-[13px] text-ink2">
                    Create the first category to start adding products.
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-[13px] text-ink2">
                    Loading categories…
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {viewingBrandsCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-card border border-line bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <h3 className="text-[16px] font-semibold text-ink">
                  Brands in &quot;{viewingBrandsCategory.name}&quot;
                </h3>
                <p className="text-[12px] text-ink2">
                  All manufacturer brands linked to products under this category
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewingBrandsCategory(null)}
                className="text-[13px] font-bold text-ink2 hover:text-ink"
              >
                ✕
              </button>
            </div>

            {loadingCategoryBrands ? (
              <p className="py-8 text-center text-[13px] text-ink2">Loading brands...</p>
            ) : categoryBrands.length > 0 ? (
              <div className="max-h-80 overflow-y-auto divide-y divide-line">
                {categoryBrands.map((brand) => (
                  <div key={brand.id} className="flex items-center justify-between py-2.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-7 w-7 items-center justify-center rounded bg-neutral-100 font-bold text-ink text-[10px]">
                        {brand.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <span className="text-[13px] font-medium text-ink">{brand.name}</span>
                        <span className="ml-2 text-[11px] text-ink2 font-mono">/{brand.slug}</span>
                      </div>
                    </div>
                    {brand._count?.products !== undefined && (
                      <span className="text-[12px] font-semibold text-ink2">
                        {brand._count.products} products
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-[13px] text-ink2">
                No distinct saved brands found for products in this category yet.
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-line">
              <button
                type="button"
                onClick={() => setViewingBrandsCategory(null)}
                className="rounded-full border border-line px-5 py-2 text-[12px] text-ink"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
