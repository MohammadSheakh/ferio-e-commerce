import { NextResponse } from "next/server";
import { adminApi } from "@/lib/admin-api";
import { adminApiErrorResponse } from "@/lib/bff-response";
import type { WarrantyClaimPage } from "@/lib/warranty";

export async function GET(request: Request) {
  try {
    return NextResponse.json({
      data: await adminApi<WarrantyClaimPage>(
        `/admin/warranty${new URL(request.url).search}`,
      ),
    });
  } catch (error) {
    return adminApiErrorResponse(error, "Unable to load warranty claims.");
  }
}
