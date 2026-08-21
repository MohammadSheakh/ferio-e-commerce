import { NextResponse } from "next/server";
import { adminApi } from "@/lib/admin-api";
import { adminApiErrorResponse } from "@/lib/bff-response";
import type { CatalogProduct, ProductPage } from "@/lib/catalog";

export async function GET(request: Request) {
  try {
    const products = await adminApi<ProductPage>(
      `/admin/catalog/products${new URL(request.url).search}`,
    );
    return NextResponse.json({ data: products });
  } catch (error) {
    return adminApiErrorResponse(error, "Unable to load products.");
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
    return adminApiErrorResponse(error, "Unable to create product.");
  }
}
