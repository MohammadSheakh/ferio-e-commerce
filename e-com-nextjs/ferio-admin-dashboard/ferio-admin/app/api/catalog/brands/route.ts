import { NextResponse } from "next/server";
import { adminApi } from "@/lib/admin-api";
import { adminApiErrorResponse } from "@/lib/bff-response";
import type { CatalogBrand } from "@/lib/catalog";

export async function GET(request: Request) {
  try {
    const brands = await adminApi<CatalogBrand[]>(
      `/admin/catalog/brands${new URL(request.url).search}`,
    );
    return NextResponse.json({ data: brands });
  } catch (error) {
    return adminApiErrorResponse(error, "Unable to load brands.");
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
    return adminApiErrorResponse(error, "Unable to create brand.");
  }
}
