import Topbar from "@/components/Topbar";
import ProductForm from "@/components/catalog/ProductForm";
import { adminApi } from "@/lib/admin-api";
import type { CatalogCategory } from "@/lib/catalog";

export default async function NewProductPage() {
  let categories: CatalogCategory[] = [];
  let error = "";
  try {
    categories = await adminApi<CatalogCategory[]>("/admin/catalog/categories");
  } catch (requestError) {
    error = requestError instanceof Error ? requestError.message : "Unable to load categories.";
  }

  return <><Topbar title="Add product" subtitle="Create a SKU-backed catalog item" />{error ? <p role="alert" className="p-8 text-[13px] text-rose-700">{error}</p> : <ProductForm categories={categories} />}</>;
}
