import { NextResponse } from "next/server";
import { adminApi } from "@/lib/admin-api";
import { adminApiErrorResponse } from "@/lib/bff-response";
import type { CatalogProduct } from "@/lib/catalog";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const body = await request.json();
    const product = await adminApi<CatalogProduct>(
      `/admin/catalog/products/${params.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    return NextResponse.json({ data: product });
  } catch (error) {
    return adminApiErrorResponse(error, "Unable to update product.");
  }
}
