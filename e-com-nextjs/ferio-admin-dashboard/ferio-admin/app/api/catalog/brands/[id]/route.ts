import { NextResponse } from "next/server";
import { AdminApiError, adminApi } from "@/lib/admin-api";
import type { CatalogBrand } from "@/lib/catalog";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const brand = await adminApi<CatalogBrand>(`/admin/catalog/brands/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return NextResponse.json({ data: brand });
  } catch (error) {
    const status = error instanceof AdminApiError ? error.status : 503;
    const message =
      error instanceof Error ? error.message : "Unable to update brand.";
    return NextResponse.json({ message }, { status });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const result = await adminApi<{ id: string; deleted: boolean }>(
      `/admin/catalog/brands/${id}`,
      { method: "DELETE" },
    );
    return NextResponse.json({ data: result });
  } catch (error) {
    const status = error instanceof AdminApiError ? error.status : 503;
    const message =
      error instanceof Error ? error.message : "Unable to delete brand.";
    return NextResponse.json({ message }, { status });
  }
}
