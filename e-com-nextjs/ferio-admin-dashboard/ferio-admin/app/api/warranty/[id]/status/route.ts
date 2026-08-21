import { NextResponse } from "next/server";
import { adminApi } from "@/lib/admin-api";
import { adminApiErrorResponse } from "@/lib/bff-response";
import type { WarrantyClaim } from "@/lib/warranty";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    return NextResponse.json({
      data: await adminApi<WarrantyClaim>(
        `/admin/warranty/${params.id}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(await request.json()),
        },
      ),
    });
  } catch (error) {
    return adminApiErrorResponse(error, "Unable to update warranty claim.");
  }
}
