import { NextResponse } from "next/server";
import { adminApi } from "@/lib/admin-api";
import { adminApiErrorResponse } from "@/lib/bff-response";
import type { CatalogCategory } from "@/lib/catalog";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const body = await request.json();
    const category = await adminApi<CatalogCategory>(
      `/admin/catalog/categories/${params.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    return NextResponse.json({ data: category });
  } catch (error) {
    return adminApiErrorResponse(error, "Unable to update category.");
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const result = await adminApi<{ id: string; deleted: true }>(
      `/admin/catalog/categories/${params.id}`,
      { method: "DELETE" },
    );
    return NextResponse.json({ data: result });
  } catch (error) {
    return adminApiErrorResponse(error, "Unable to delete category.");
  }
}
