import { NextResponse } from "next/server";
import { adminApi } from "@/lib/admin-api";
import { adminApiErrorResponse } from "@/lib/bff-response";
import type { DeliveryZone } from "@/lib/delivery";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const body = await request.json();
    const zone = await adminApi<DeliveryZone>(
      `/admin/delivery-zones/${params.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    return NextResponse.json({ data: zone });
  } catch (error) {
    return adminApiErrorResponse(error, "Unable to update delivery zone.");
  }
}
