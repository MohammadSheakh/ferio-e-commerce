"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Topbar from "@/components/Topbar";
import CopyableId from "@/components/CopyableId";
import Pagination from "@/components/Pagination";
import { formatTaka, ProductPage } from "@/lib/catalog";

const statusColor: Record<string, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700",
  DRAFT: "bg-surface text-ink2",
  ARCHIVED: "bg-rose-50 text-rose-700",
};

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductPage>({
    items: [],
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams({
        page: String(page),
        limit: String(pageSize),
      });
      if (search) query.set("search", search);

      const res = await fetch(`/api/catalog/products?${query.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Unable to load products");
      const data = await res.json();
      setProducts(data.data || data);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load products.",
      );
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  return (
    <>
      <Topbar title="Products" subtitle={`${products.total} products`} />
      <div className="p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSearch(searchInput.trim());
              setPage(1);
            }}
            className="flex max-w-lg flex-1 gap-2"
          >
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search product name or SKU"
              className="min-w-0 flex-1 rounded-full border border-line px-4 py-2 text-[13px] focus:border-ink"
            />
            <button className="rounded-full bg-ink px-5 py-2 text-[13px] text-white">
              Search
            </button>
          </form>

          <div className="flex justify-end gap-3">
            <Link
              href="/dashboard/requested-products"
              className="rounded-full border border-line px-5 py-2 text-[13px] text-ink2 hover:text-ink"
            >
              Requested products
            </Link>
            <Link
              href="/dashboard/categories"
              className="rounded-full border border-line px-5 py-2 text-[13px] text-ink2 hover:text-ink"
            >
              Categories
            </Link>
            <Link
              href="/dashboard/brands"
              className="rounded-full border border-line px-5 py-2 text-[13px] text-ink2 hover:text-ink"
            >
              Brands
            </Link>
            <Link
              href="/dashboard/reviews"
              className="rounded-full border border-line px-5 py-2 text-[13px] text-ink2 hover:text-ink"
            >
              YouTube reviews
            </Link>
            <Link
              href="/dashboard/products/new"
              className="rounded-full bg-ink px-5 py-2 text-[13px] font-medium text-white hover:opacity-85"
            >
              Add product
            </Link>
          </div>
        </div>

        {error && (
          <p role="alert" className="mt-4 text-[13px] text-rose-700">
            {error}
          </p>
        )}

        <div className="mt-6 overflow-x-auto border-y border-line">
          <table className="w-full min-w-[760px] text-left">
            <thead>
              <tr className="text-[11px] uppercase tracking-eyebrow text-ink2">
                <th className="px-4 py-3 font-normal w-24">Id</th>
                <th className="px-5 py-3 font-normal">Product</th>
                <th className="px-5 py-3 font-normal">Category</th>
                <th className="px-5 py-3 font-normal">Price</th>
                <th className="px-5 py-3 font-normal">Stock</th>
                <th className="px-5 py-3 font-normal">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {products.items.map((product) => (
                <tr key={product.id} className="text-[13px] text-ink/80">
                  <td className="px-4 py-3.5 w-24">
                    <CopyableId id={product.id} />
                  </td>
                  <td className="px-5 py-3.5 text-ink">
                    <Link
                      href={`/dashboard/products/${product.id}`}
                      className="hover:underline font-medium"
                    >
                      {product.name}
                    </Link>
                    <p className="text-[11px] text-ink2">
                      {product.variants.length} variant
                      {product.variants.length === 1 ? "" : "s"}
                      {product.condition === "SECOND_HAND"
                        ? " · second-hand"
                        : ""}
                    </p>
                  </td>
                  <td className="px-5 py-3.5 text-ink2">
                    {product.category?.name || "—"}
                  </td>
                  <td className="px-5 py-3.5">{formatTaka(product.price)}</td>
                  <td className="px-5 py-3.5">{product.availableStock}</td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] ${
                        statusColor[product.status] || "bg-surface text-ink2"
                      }`}
                    >
                      {product.status.toLowerCase()}
                    </span>
                  </td>
                </tr>
              ))}
              {!loading && products.items.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-12 text-center text-[13px] text-ink2"
                  >
                    {error ||
                      "No products found. Create a category, then add your first product."}
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-12 text-center text-[13px] text-ink2"
                  >
                    Loading products...
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <Pagination
            currentPage={page}
            totalPages={products.totalPages}
            totalItems={products.total}
            pageSize={pageSize}
            onPageChange={(newPage) => setPage(newPage)}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setPage(1);
            }}
            isLoading={loading}
          />
        </div>
      </div>
    </>
  );
}
