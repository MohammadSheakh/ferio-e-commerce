import { NextResponse } from "next/server";
import { AdminApiError, adminApi } from "@/lib/admin-api";
import type { CatalogCategory } from "@/lib/catalog";

export async function GET() {
  try {
    const categories = await adminApi<CatalogCategory[]>(
      "/admin/catalog/categories",
    );
    return NextResponse.json({ data: categories });
  } catch (error) {
    const status = error instanceof AdminApiError ? error.status : 503;
    const message =
      error instanceof Error ? error.message : "Unable to load categories.";
    return NextResponse.json({ message }, { status });
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
    const status = error instanceof AdminApiError ? error.status : 503;
    const message =
      error instanceof Error ? error.message : "Unable to create category.";
    return NextResponse.json({ message }, { status });
  }
}
