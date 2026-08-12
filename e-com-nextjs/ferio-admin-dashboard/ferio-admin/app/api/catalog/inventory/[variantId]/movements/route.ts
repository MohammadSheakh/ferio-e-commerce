import { NextResponse } from "next/server";
import { AdminApiError, adminApi } from "@/lib/admin-api";
import type { InventoryMovement } from "@/lib/catalog";

export async function GET(
  request: Request,
  { params }: { params: { variantId: string } },
) {
  try {
    const query = new URL(request.url).search;
    const movements = await adminApi<InventoryMovement[]>(
      `/admin/catalog/inventory/${params.variantId}/movements${query}`,
    );
    return NextResponse.json({ data: movements });
  } catch (error) {
    const status = error instanceof AdminApiError ? error.status : 503;
    const message =
      error instanceof Error
        ? error.message
        : "Unable to load inventory history.";
    return NextResponse.json({ message }, { status });
  }
}
