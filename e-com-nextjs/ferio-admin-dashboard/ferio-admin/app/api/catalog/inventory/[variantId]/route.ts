import { NextResponse } from "next/server";
import { AdminApiError, adminApi } from "@/lib/admin-api";

export async function PATCH(
  request: Request,
  { params }: { params: { variantId: string } },
) {
  try {
    const body = await request.json();
    const inventory = await adminApi(
      `/admin/catalog/inventory/${params.variantId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    return NextResponse.json({ data: inventory });
  } catch (error) {
    const status = error instanceof AdminApiError ? error.status : 503;
    const message =
      error instanceof Error ? error.message : "Unable to adjust inventory.";
    return NextResponse.json({ message }, { status });
  }
}
