import { NextResponse } from "next/server";
import { adminApi } from "@/lib/admin-api";
import { adminApiErrorResponse } from "@/lib/bff-response";
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
    return adminApiErrorResponse(error, "Unable to load inventory history.");
  }
}
