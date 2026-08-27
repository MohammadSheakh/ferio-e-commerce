import { NextResponse } from "next/server";
import { adminApi } from "@/lib/admin-api";
import { adminApiErrorResponse } from "@/lib/bff-response";
import type { CatalogCategory } from "@/lib/catalog";

export async function GET() {
  try {
    const categories = await adminApi<CatalogCategory[]>(
      "/admin/catalog/categories",
    );
    return NextResponse.json({ data: categories });
  } catch (error) {
    return adminApiErrorResponse(error, "Unable to load categories.");
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const category = await adminApi<CatalogCategory>(
      "/admin/catalog/categories",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    return NextResponse.json({ data: category }, { status: 201 });
  } catch (error) {
    return adminApiErrorResponse(error, "Unable to create category.");
  }
}
