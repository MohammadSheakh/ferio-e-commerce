import { NextResponse } from "next/server";
import { AdminApiError, adminApi } from "@/lib/admin-api";
import type { CatalogProduct, ProductPage } from "@/lib/catalog";

export async function GET(request: Request) {
  try {
    const products = await adminApi<ProductPage>(
      `/admin/catalog/products${new URL(request.url).search}`,
    );
    return NextResponse.json({ data: products });
  } catch (error) {
    const status = error instanceof AdminApiError ? error.status : 503;
    const message =
      error instanceof Error ? error.message : "Unable to load products.";
    return NextResponse.json({ message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const product = await adminApi<CatalogProduct>("/admin/catalog/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return NextResponse.json({ data: product }, { status: 201 });
  } catch (error) {
    const status = error instanceof AdminApiError ? error.status : 503;
    const message =
      error instanceof Error ? error.message : "Unable to create product.";
    return NextResponse.json({ message }, { status });
  }
}
