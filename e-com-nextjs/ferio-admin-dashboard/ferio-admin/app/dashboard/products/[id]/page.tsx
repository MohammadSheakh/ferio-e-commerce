import Topbar from "@/components/Topbar";
import ProductForm from "@/components/catalog/ProductForm";
import { adminApi } from "@/lib/admin-api";
import type { CatalogCategory, CatalogProduct } from "@/lib/catalog";

export default async function EditProductPage({ params }: { params: { id: string } }) {
  try {
    const [product, categories] = await Promise.all([
      adminApi<CatalogProduct>(`/admin/catalog/products/${params.id}`),
      adminApi<CatalogCategory[]>("/admin/catalog/categories"),
    ]);
    return <><Topbar title="Edit product" subtitle={`${product.name} · ${product.status.toLowerCase()}`} /><ProductForm product={product} categories={categories} /></>;
  } catch (error) {
    return <><Topbar title="Edit product" subtitle="Catalog operation" /><p role="alert" className="p-8 text-[13px] text-rose-700">{error instanceof Error ? error.message : "Unable to load product."}</p></>;
  }
}
