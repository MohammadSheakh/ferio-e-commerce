import { NextResponse } from "next/server";
import { adminApi } from "@/lib/admin-api";
import { adminApiErrorResponse } from "@/lib/bff-response";

export async function POST(
  _request: Request,
  { params }: { params: { id: string } },
) {
  try {
    return NextResponse.json({
      data: await adminApi(`/admin/shipping/shipments/${params.id}/poll`, {
        method: "POST",
      }),
    });
  } catch (error) {
    return adminApiErrorResponse(error, "Unable to queue shipment poll.");
  }
}
