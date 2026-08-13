import { NextResponse } from "next/server";
import { AdminApiError, adminApi } from "@/lib/admin-api";
import type { PurchaseActivityPage } from "@/lib/purchase-activity";

export async function GET(request: Request) {
  try {
    const data = await adminApi<PurchaseActivityPage>(
      `/admin/purchase-activity${new URL(request.url).search}`,
    );
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to load purchase activity." },
      { status: error instanceof AdminApiError ? error.status : 503 },
    );
  }
}
