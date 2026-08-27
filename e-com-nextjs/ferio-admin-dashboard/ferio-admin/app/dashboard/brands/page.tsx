import Topbar from "@/components/Topbar";
import { adminApi } from "@/lib/admin-api";
import type { CatalogBrand } from "@/lib/catalog";
import BrandsManager from "@/components/catalog/BrandsManager";

export default async function BrandsPage() {
  let brands: CatalogBrand[] = [];
  let error = "";

  try {
    brands = await adminApi<CatalogBrand[]>("/admin/catalog/brands");
  } catch (err) {
    error = err instanceof Error ? err.message : "Unable to load brands.";
  }

  return (
    <div>
      <Topbar title="Brands" subtitle="Manage catalog product brands and manufacturer relationships" />
      {error ? (
        <p role="alert" className="p-8 text-[13px] text-rose-700">
          {error}
        </p>
      ) : (
        <BrandsManager initialBrands={brands} />
      )}
    </div>
  );
}
