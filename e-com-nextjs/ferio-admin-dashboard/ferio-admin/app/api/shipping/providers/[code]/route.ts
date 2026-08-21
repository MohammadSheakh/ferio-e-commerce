import { NextResponse } from "next/server";
import { adminApi } from "@/lib/admin-api";
import { adminApiErrorResponse } from "@/lib/bff-response";
import type { ShipmentProvider } from "@/lib/shipping";

export async function PATCH(
  request: Request,
  { params }: { params: { code: string } },
) {
  try {
    const body = await request.json();
    const provider = await adminApi<ShipmentProvider>(
      `/admin/shipping/providers/${params.code}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    return NextResponse.json({ data: provider });
  } catch (error) {
    return adminApiErrorResponse(error, "Unable to update courier provider.");
  }
}
