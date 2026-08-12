import { NextResponse } from "next/server";
import { AdminApiError, adminApi } from "@/lib/admin-api";
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
    const status = error instanceof AdminApiError ? error.status : 503;
    const message =
      error instanceof Error ? error.message : "Unable to update delivery zone.";
    return NextResponse.json({ message }, { status });
  }
}
