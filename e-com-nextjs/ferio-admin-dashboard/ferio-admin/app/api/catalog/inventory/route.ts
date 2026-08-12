import { NextResponse } from "next/server";
import { AdminApiError, adminApi } from "@/lib/admin-api";
import type { InventoryPage } from "@/lib/catalog";

export async function GET(request: Request) {
  try {
    const query = new URL(request.url).search;
    const inventory = await adminApi<InventoryPage>(
      `/admin/catalog/inventory${query}`,
    );
    return NextResponse.json({ data: inventory });
  } catch (error) {
    const status = error instanceof AdminApiError ? error.status : 503;
    const message =
      error instanceof Error ? error.message : "Unable to load inventory.";
    return NextResponse.json({ message }, { status });
  }
}
