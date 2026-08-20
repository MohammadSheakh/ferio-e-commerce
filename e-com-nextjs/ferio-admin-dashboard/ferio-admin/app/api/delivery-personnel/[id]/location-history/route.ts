import { NextResponse } from "next/server";
import { AdminApiError, adminApi } from "@/lib/admin-api";

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
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to clear location history." },
      { status: error instanceof AdminApiError ? error.status : 503 },
    );
  }
}
