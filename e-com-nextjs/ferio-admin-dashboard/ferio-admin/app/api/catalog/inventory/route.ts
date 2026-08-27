import { NextResponse } from "next/server";
import { adminApi } from "@/lib/admin-api";
import { adminApiErrorResponse } from "@/lib/bff-response";
import type { InventoryPage } from "@/lib/catalog";

export async function GET(request: Request) {
  try {
    const query = new URL(request.url).search;
    const inventory = await adminApi<InventoryPage>(
      `/admin/catalog/inventory${query}`,
    );
    return NextResponse.json({ data: inventory });
  } catch (error) {
    return adminApiErrorResponse(error, "Unable to load inventory.");
  }
}
