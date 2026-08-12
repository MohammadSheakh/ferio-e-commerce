import { NextResponse } from "next/server";
import { AdminApiError, adminApi } from "@/lib/admin-api";
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
    const status = error instanceof AdminApiError ? error.status : 503;
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to update courier provider." },
      { status },
    );
  }
}
