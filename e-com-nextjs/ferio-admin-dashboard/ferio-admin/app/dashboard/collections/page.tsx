"use client";

import { useEffect, useState } from "react";
import Topbar from "@/components/Topbar";
import Link from "next/link";

interface CollectionRule {
  field: "CATEGORY_ID" | "BRAND_ID" | "PRICE" | "STOCK_QUANTITY" | "TAG";
  operator: "EQUALS" | "NOT_EQUALS" | "GREATER_THAN" | "LESS_THAN_OR_EQUAL" | "CONTAINS";
  value: string;
}

interface CollectionItem {
  id: string;
  name: string;
  slug: string;
  description?: string;
  type: "MANUAL" | "AUTOMATIC";
  isActive: boolean;
  matchMode: "ALL" | "ANY";
  _count?: {
    items: number;
    rules: number;
  };
  createdAt: string;
}

export default function CollectionsPage() {
  const [collections, setCollections] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"MANUAL" | "AUTOMATIC">("MANUAL");
  const [matchMode, setMatchMode] = useState<"ALL" | "ANY">("ALL");
  const [rules, setRules] = useState<CollectionRule[]>([
    { field: "PRICE", operator: "LESS_THAN_OR_EQUAL", value: "20000" },
  ]);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<any[]>([]);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadCollections = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/catalog/collections", { cache: "no-store" });
      const data = await res.json();
      if (data.data?.items) {
        setCollections(data.data.items);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load collections");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCollections();
  }, []);

  const openProductPicker = async () => {
    setShowProductPicker(true);
    if (catalogProducts.length === 0) {
      setLoadingProducts(true);
      try {
        const res = await fetch("/api/catalog/products?limit=50");
        const data = await res.json();
        if (data.data?.items) {
          setCatalogProducts(data.data.items);
        }
      } catch {
        // ignore
      } finally {
        setLoadingProducts(false);
      }
    }
  };

  const toggleProduct = (productId: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId],
    );
  };

  const addRule = () => {
    setRules((prev) => [
      ...prev,
      { field: "STOCK_QUANTITY", operator: "GREATER_THAN", value: "0" },
    ]);
  };

  const removeRule = (index: number) => {
    setRules((prev) => prev.filter((_, idx) => idx !== index));
  };

  const updateRule = (index: number, key: keyof CollectionRule, val: string) => {
    setRules((prev) =>
      prev.map((r, idx) => (idx === index ? { ...r, [key]: val } : r)),
    );
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const payload: any = {
        name,
        slug: slug || undefined,
        description: description || undefined,
        type,
        matchMode,
      };

      if (type === "AUTOMATIC") {
        payload.rules = rules;
      } else {
        payload.productIds = selectedProductIds;
      }

      const res = await fetch("/api/catalog/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to create collection");

      setShowCreateModal(false);
      setName("");
      setSlug("");
      setDescription("");
      setSelectedProductIds([]);
      loadCollections();
    } catch (err: any) {
      setError(err.message || "Failed to save collection");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, colName: string) => {
    if (!confirm(`Delete collection "${colName}"?`)) return;
    try {
      const res = await fetch(`/api/catalog/collections/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      loadCollections();
    } catch (err: any) {
      alert(err.message || "Failed to delete collection.");
    }
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-surface">
      <Topbar title="Product Collections" />

      <main className="flex-1 overflow-y-auto p-6 md:p-8">
        <div className="mx-auto max-w-6xl">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-[24px] font-semibold tracking-tight text-ink">
                Collections Engine
              </h1>
              <p className="mt-1 text-[13px] text-ink2">
                Curate manual and automatic product groupings for storefront merchandising sections.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/dashboard/storefront-studio"
                className="rounded-full border border-line bg-paper px-4 py-2 text-[13px] font-medium text-ink transition hover:bg-surface"
              >
                Storefront Studio →
              </Link>

              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="rounded-full bg-ink px-5 py-2 text-[13px] font-medium text-white transition hover:opacity-85"
              >
                + Create Collection
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-[13px] text-rose-700">
              {error}
            </div>
          )}

          {/* Table */}
          <div className="mt-8 rounded-xl border border-line bg-paper overflow-hidden">
            <table className="w-full text-left text-[13px]">
              <thead className="border-b border-line bg-surface/50 text-[11px] uppercase tracking-wider text-ink2">
                <tr>
                  <th className="px-6 py-3 font-semibold">Collection Name</th>
                  <th className="px-6 py-3 font-semibold">Type</th>
                  <th className="px-6 py-3 font-semibold">Merchandising Target</th>
                  <th className="px-6 py-3 font-semibold">Status</th>
                  <th className="px-6 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-ink">
                {collections.map((col) => (
                  <tr key={col.id} className="hover:bg-surface/30 transition">
                    <td className="px-6 py-4">
                      <span className="font-medium text-ink">{col.name}</span>
                      <p className="text-[11px] text-ink2">{col.slug}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium border ${
                          col.type === "AUTOMATIC"
                            ? "bg-surface text-ink border-line"
                            : "bg-surface/50 text-ink2 border-line"
                        }`}
                      >
                        {col.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-ink2">
                      {col.type === "AUTOMATIC"
                        ? `${col._count?.rules || 0} Dynamic Rules (${col.matchMode})`
                        : `${col._count?.items || 0} Manual Products`}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-block h-2 w-2 rounded-full mr-2 ${
                          col.isActive ? "bg-emerald-500" : "bg-ink2/30"
                        }`}
                      />
                      <span className="text-[12px]">
                        {col.isActive ? "Active" : "Archived"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(col.id, col.name)}
                        className="text-[12px] text-rose-600 hover:text-rose-800"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}

                {collections.length === 0 && !loading && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-ink2">
                      No collections created yet. Click &quot;+ Create Collection&quot; to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <div className="w-full max-w-lg rounded-card border border-line bg-paper p-6">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="text-[16px] font-semibold text-ink">
                Create Merchandising Collection
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-[13px] text-ink2 hover:text-ink"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="mt-4 space-y-4">
              <div>
                <label className="block text-[11px] font-medium uppercase text-ink2 mb-1">
                  Collection Title
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!slug) {
                      setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-"));
                    }
                  }}
                  placeholder="e.g. Budget Smartphones Under ৳20,000"
                  className="w-full rounded-lg border border-line px-3 py-2 text-[13px] text-ink focus:border-ink focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium uppercase text-ink2 mb-1">
                  URL Slug
                </label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="e.g. budget-smartphones"
                  className="w-full rounded-lg border border-line px-3 py-2 text-[13px] text-ink focus:border-ink focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium uppercase text-ink2 mb-1">
                  Collection Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setType("MANUAL")}
                    className={`rounded-lg border p-3 text-left transition ${
                      type === "MANUAL"
                        ? "border-ink bg-surface text-ink font-medium"
                        : "border-line bg-paper text-ink2"
                    }`}
                  >
                    <p className="text-[13px]">Manual</p>
                    <p className="text-[11px] text-ink2 mt-0.5">
                      Handpick specific products
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setType("AUTOMATIC")}
                    className={`rounded-lg border p-3 text-left transition ${
                      type === "AUTOMATIC"
                        ? "border-ink bg-surface text-ink font-medium"
                        : "border-line bg-paper text-ink2"
                    }`}
                  >
                    <p className="text-[13px]">Automatic (Rules)</p>
                    <p className="text-[11px] text-ink2 mt-0.5">
                      Match by price, category, stock
                    </p>
                  </button>
                </div>
              </div>

              {type === "MANUAL" && (
                <div className="border-t border-line pt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium uppercase text-ink2">
                      Curated Products
                    </span>
                    <span className="text-[12px] font-medium text-ink">
                      {selectedProductIds.length} items selected
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={openProductPicker}
                    className="w-full rounded-lg border border-line bg-surface py-2.5 text-[12px] font-medium text-ink transition hover:bg-surface/80"
                  >
                    {selectedProductIds.length === 0
                      ? "+ Pick Products from Catalog"
                      : `Edit Selected Products (${selectedProductIds.length})`}
                  </button>
                </div>
              )}

              {type === "AUTOMATIC" && (
                <div className="border-t border-line pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium uppercase text-ink2">
                      Matching Conditions
                    </span>
                    <select
                      value={matchMode}
                      onChange={(e) => setMatchMode(e.target.value as "ALL" | "ANY")}
                      className="rounded border border-line px-2 py-1 text-[11px] text-ink"
                    >
                      <option value="ALL">Match ALL conditions (AND)</option>
                      <option value="ANY">Match ANY condition (OR)</option>
                    </select>
                  </div>

                  <div className="space-y-2 max-h-[160px] overflow-y-auto">
                    {rules.map((rule, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <select
                          value={rule.field}
                          onChange={(e) => updateRule(idx, "field", e.target.value)}
                          className="w-1/3 rounded border border-line px-2 py-1 text-[12px]"
                        >
                          <option value="PRICE">Price</option>
                          <option value="STOCK_QUANTITY">Stock Quantity</option>
                          <option value="TITLE">Product Title</option>
                          <option value="CATEGORY_ID">Category ID</option>
                          <option value="TAG">Tag</option>
                        </select>

                        <select
                          value={rule.operator}
                          onChange={(e) => updateRule(idx, "operator", e.target.value)}
                          className="w-1/3 rounded border border-line px-2 py-1 text-[12px]"
                        >
                          <option value="LESS_THAN_OR_EQUAL">&lt;= (At most)</option>
                          <option value="GREATER_THAN">&gt; (Greater than)</option>
                          <option value="EQUALS">= (Equals)</option>
                          <option value="CONTAINS">Contains</option>
                        </select>

                        <input
                          type="text"
                          value={rule.value}
                          onChange={(e) => updateRule(idx, "value", e.target.value)}
                          className="w-1/3 rounded border border-line px-2 py-1 text-[12px]"
                          placeholder="Value"
                        />

                        {rules.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeRule(idx)}
                            className="text-rose-500 hover:text-rose-700 text-[13px]"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={addRule}
                    className="text-[12px] text-ink underline"
                  >
                    + Add Condition
                  </button>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-line">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-full border border-line px-4 py-2 text-[12px] font-medium text-ink hover:bg-surface"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-full bg-ink px-6 py-2 text-[12px] font-medium text-white transition hover:opacity-85 disabled:opacity-50"
                >
                  {saving ? "Creating..." : "Create Collection"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Product Picker Modal */}
      {showProductPicker && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/40 p-4">
          <div className="w-full max-w-xl rounded-card border border-line bg-paper p-6 flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <h3 className="text-[16px] font-semibold text-ink">
                  Select Products for Collection
                </h3>
                <p className="text-[12px] text-ink2 mt-0.5">
                  {selectedProductIds.length} products selected
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowProductPicker(false)}
                className="text-[13px] text-ink2 hover:text-ink"
              >
                ✕
              </button>
            </div>

            <div className="mt-3">
              <input
                type="text"
                placeholder="Search products by name or category..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full rounded-lg border border-line px-3 py-2 text-[13px] text-ink focus:border-ink focus:outline-none"
              />
            </div>

            <div className="mt-4 flex-1 overflow-y-auto divide-y divide-line">
              {loadingProducts ? (
                <div className="py-12 text-center text-[13px] text-ink2">
                  Loading catalog products...
                </div>
              ) : (
                catalogProducts
                  .filter((p) => {
                    if (!productSearch) return true;
                    const q = productSearch.toLowerCase();
                    return (
                      p.name.toLowerCase().includes(q) ||
                      p.category?.name?.toLowerCase().includes(q)
                    );
                  })
                  .map((product) => {
                    const isSelected = selectedProductIds.includes(product.id);
                    return (
                      <div
                        key={product.id}
                        onClick={() => toggleProduct(product.id)}
                        className={`flex items-center justify-between py-2.5 px-2 rounded-lg cursor-pointer transition ${
                          isSelected ? "bg-surface" : "hover:bg-surface/50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleProduct(product.id)}
                            className="rounded border-line"
                          />
                          <div className="h-10 w-10 rounded bg-surface border border-line flex items-center justify-center overflow-hidden">
                            {product.image ? (
                              <img
                                src={product.image}
                                alt={product.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span className="text-[9px] text-ink2">No img</span>
                            )}
                          </div>
                          <div>
                            <p className="text-[13px] font-medium text-ink">
                              {product.name}
                            </p>
                            <p className="text-[11px] text-ink2">
                              {product.category?.name || "General"} • ৳
                              {product.price?.toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${
                            isSelected
                              ? "bg-ink text-white border-ink"
                              : "bg-surface text-ink2 border-line"
                          }`}
                        >
                          {isSelected ? "Selected" : "Add"}
                        </span>
                      </div>
                    );
                  })
              )}

              {!loadingProducts && catalogProducts.length === 0 && (
                <div className="py-12 text-center text-[13px] text-ink2">
                  No products found in the catalog.
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-line mt-3">
              <span className="text-[12px] text-ink2">
                {selectedProductIds.length} items curated
              </span>
              <button
                type="button"
                onClick={() => setShowProductPicker(false)}
                className="rounded-full bg-ink px-6 py-2 text-[12px] font-medium text-white transition hover:opacity-85"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

