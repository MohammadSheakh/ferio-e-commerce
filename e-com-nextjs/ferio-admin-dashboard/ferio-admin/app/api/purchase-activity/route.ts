import { NextResponse } from "next/server";
import { adminApi } from "@/lib/admin-api";
import { adminApiErrorResponse } from "@/lib/bff-response";
import type { PurchaseActivityPage } from "@/lib/purchase-activity";

export async function GET(request: Request) {
  try {
    const data = await adminApi<PurchaseActivityPage>(
      `/admin/purchase-activity${new URL(request.url).search}`,
    );
    return NextResponse.json({ data });
  } catch (error) {
    return adminApiErrorResponse(error, "Unable to load purchase activity.");
  }
}
