import { NextResponse } from "next/server";
import { adminApi } from "@/lib/admin-api";
import { adminApiErrorResponse } from "@/lib/bff-response";

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const data = await adminApi(`/delivery-personnel/admin/${params.id}/location-history`, {
      method: "DELETE",
    });
    return NextResponse.json({ data });
  } catch (error) {
    return adminApiErrorResponse(error, "Unable to clear location history.");
  }
}
