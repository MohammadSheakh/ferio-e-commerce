"use client";

import { useState } from "react";
import type { CatalogBrand } from "@/lib/catalog";

const inputClass =
  "w-full rounded-card border border-line px-3.5 py-2 text-[13px] outline-none focus:border-ink";

export default function BrandsManager({
  initialBrands,
}: {
  initialBrands: CatalogBrand[];
}) {
  const [brands, setBrands] = useState<CatalogBrand[]>(initialBrands);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<CatalogBrand | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function openCreateModal() {
    setEditingBrand(null);
    setName("");
    setSlug("");
    setDescription("");
    setLogoUrl("");
    setIsActive(true);
    setError("");
    setIsModalOpen(true);
  }

  function openEditModal(brand: CatalogBrand) {
    setEditingBrand(brand);
    setName(brand.name);
    setSlug(brand.slug);
    setDescription(brand.description ?? "");
    setLogoUrl(brand.logoUrl ?? "");
    setIsActive(brand.isActive);
    setError("");
    setIsModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const body = {
        name: name.trim(),
        slug: slug.trim() || undefined,
        description: description.trim() || undefined,
        logoUrl: logoUrl.trim() || undefined,
        isActive,
      };

      const url = editingBrand
        ? `/api/catalog/brands/${editingBrand.id}`
        : "/api/catalog/brands";
      const method = editingBrand ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const payload = (await res.json()) as { data?: CatalogBrand; message?: string };
      if (!res.ok || !payload.data) {
        throw new Error(payload.message || "Failed to save brand.");
      }

      const savedBrand = payload.data;
      if (editingBrand) {
        setBrands((prev) =>
          prev.map((b) => (b.id === savedBrand.id ? savedBrand : b)),
        );
      } else {
        setBrands((prev) => [...prev, savedBrand].sort((a, b) => a.name.localeCompare(b.name)));
      }

      setIsModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save brand.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(brand: CatalogBrand) {
    if (
      !confirm(
        `Are you sure you want to delete brand "${brand.name}"? Products using this brand will fall back to brand text.`,
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/catalog/brands/${brand.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = (await res.json()) as { message?: string };
        throw new Error(body.message || "Failed to delete brand.");
      }
      setBrands((prev) => prev.filter((b) => b.id !== brand.id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete brand.");
    }
  }

  const filteredBrands = brands.filter(
    (b) =>
      b.name.toLowerCase().includes(search.trim().toLowerCase()) ||
      b.slug.toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <div className="p-8 max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search brands by name or slug..."
          className="w-80 rounded-card border border-line px-3.5 py-2 text-[13px] outline-none focus:border-ink"
        />

        <button
          type="button"
          onClick={openCreateModal}
          className="rounded-full bg-ink px-4 py-2 text-[13px] font-medium text-white hover:opacity-90"
        >
          Add new brand
        </button>
      </div>

      <div className="rounded-card border border-line bg-white overflow-hidden shadow-sm">
        <table className="w-full text-left text-[13px]">
          <thead className="border-b border-line bg-neutral-50 font-medium text-ink2">
            <tr>
              <th className="p-4">Brand Name</th>
              <th className="p-4">Slug</th>
              <th className="p-4">Products</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {filteredBrands.map((brand) => (
              <tr key={brand.id} className="hover:bg-neutral-50/50">
                <td className="p-4 font-medium text-ink">
                  <div className="flex items-center gap-3">
                    {brand.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={brand.logoUrl}
                        alt={brand.name}
                        className="h-8 w-8 rounded object-contain border border-line"
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded bg-neutral-100 font-bold text-ink2 text-[11px]">
                        {brand.name.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div>{brand.name}</div>
                      {brand.description && (
                        <p className="text-[11px] text-ink2 truncate max-w-xs">
                          {brand.description}
                        </p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="p-4 text-ink2 font-mono text-[12px]">{brand.slug}</td>
                <td className="p-4 text-ink font-semibold">
                  {brand._count?.products ?? 0}
                </td>
                <td className="p-4">
                  {brand.isActive ? (
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-medium text-emerald-800">
                      Active
                    </span>
                  ) : (
                    <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-[11px] font-medium text-neutral-600">
                      Inactive
                    </span>
                  )}
                </td>
                <td className="p-4 text-right space-x-2">
                  <button
                    type="button"
                    onClick={() => openEditModal(brand)}
                    className="text-[12px] font-medium text-ink hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(brand)}
                    className="text-[12px] font-medium text-rose-600 hover:underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}

            {filteredBrands.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-ink2">
                  No brands found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-card border border-line bg-white p-6 shadow-2xl space-y-4">
            <h3 className="text-[16px] font-semibold text-ink">
              {editingBrand ? "Edit Brand" : "Create New Brand"}
            </h3>

            <form onSubmit={handleSave} className="space-y-4">
              <label className="block text-[12px] text-ink2">
                Brand Name *
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`${inputClass} mt-1`}
                  placeholder="e.g. Asus, Apple, Logitech"
                />
              </label>

              <label className="block text-[12px] text-ink2">
                URL Slug (optional)
                <input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className={`${inputClass} mt-1`}
                  placeholder="e.g. asus"
                />
              </label>

              <label className="block text-[12px] text-ink2">
                Description (optional)
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={`${inputClass} mt-1`}
                  placeholder="Short brand overview..."
                />
              </label>

              <label className="block text-[12px] text-ink2">
                Logo URL (optional)
                <input
                  type="url"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  className={`${inputClass} mt-1`}
                  placeholder="https://..."
                />
              </label>

              <label className="flex items-center gap-2 text-[13px] text-ink">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                Active brand (visible in storefront filters)
              </label>

              {error && <p className="text-[12px] text-rose-600">{error}</p>}

              <div className="flex justify-end gap-3 border-t border-line pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-full border border-line px-4 py-2 text-[12px] text-ink2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-full bg-ink px-5 py-2 text-[12px] font-medium text-white disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save brand"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
