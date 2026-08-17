import Link from "next/link";
import Topbar from "@/components/Topbar";
import { adminApi } from "@/lib/admin-api";
import { formatTaka, ProductPage } from "@/lib/catalog";

const statusColor: Record<string, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700",
  DRAFT: "bg-surface text-ink2",
  ARCHIVED: "bg-rose-50 text-rose-700",
};

export default async function ProductsPage() {
  let products: ProductPage = {
    items: [],
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  };
  let error = "";

  try {
    products = await adminApi<ProductPage>("/admin/catalog/products?limit=50");
  } catch (requestError) {
    error =
      requestError instanceof Error
        ? requestError.message
        : "Unable to load products.";
  }

  return (
    <>
      <Topbar title="Products" subtitle={`${products.total} products`} />
      <div className="p-8">
        <div className="flex justify-end gap-3">
          <Link
            href="/dashboard/categories"
            className="rounded-full border border-line px-5 py-2.5 text-[13px] text-ink2 hover:text-ink"
          >
            Categories
          </Link>
          <Link
            href="/dashboard/brands"
            className="rounded-full border border-line px-5 py-2.5 text-[13px] text-ink2 hover:text-ink"
          >
            Brands
          </Link>
          <Link
            href="/dashboard/reviews"
            className="rounded-full border border-line px-5 py-2.5 text-[13px] text-ink2 hover:text-ink"
          >
            YouTube reviews
          </Link>
          <Link
            href="/dashboard/products/new"
            className="rounded-full bg-ink px-5 py-2.5 text-[13px] font-medium text-white hover:opacity-85"
          >
            + Add product
          </Link>
        </div>

        <div className="mt-6 overflow-hidden rounded-card border border-line">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[11px] uppercase tracking-eyebrow text-ink2">
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
                  <td className="px-5 py-3.5 text-ink">
                    <Link href={`/dashboard/products/${product.id}`} className="hover:underline">
                      {product.name}
                    </Link>
                    <p className="text-[11px] text-ink2">
                      {product.variants.length} variant{product.variants.length === 1 ? "" : "s"}{product.condition === "SECOND_HAND" ? " · second-hand" : ""}
                    </p>
                  </td>
                  <td className="px-5 py-3.5 text-ink2">{product.category.name}</td>
                  <td className="px-5 py-3.5">{formatTaka(product.price)}</td>
                  <td className="px-5 py-3.5">{product.availableStock}</td>
                  <td className="px-5 py-3.5">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] ${statusColor[product.status]}`}>
                      {product.status.toLowerCase()}
                    </span>
                  </td>
                </tr>
              ))}
              {products.items.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-[13px] text-ink2">
                    {error || "No products yet. Create a category, then add the first product."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
