import { NextResponse } from "next/server";
import { AdminApiError, adminApi } from "@/lib/admin-api";
import type { CatalogBrand } from "@/lib/catalog";

export async function GET(request: Request) {
  try {
    const brands = await adminApi<CatalogBrand[]>(
      `/admin/catalog/brands${new URL(request.url).search}`,
    );
    return NextResponse.json({ data: brands });
  } catch (error) {
    const status = error instanceof AdminApiError ? error.status : 503;
    const message =
      error instanceof Error ? error.message : "Unable to load brands.";
    return NextResponse.json({ message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const brand = await adminApi<CatalogBrand>("/admin/catalog/brands", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return NextResponse.json({ data: brand }, { status: 201 });
  } catch (error) {
    const status = error instanceof AdminApiError ? error.status : 503;
    const message =
      error instanceof Error ? error.message : "Unable to create brand.";
    return NextResponse.json({ message }, { status });
  }
}
