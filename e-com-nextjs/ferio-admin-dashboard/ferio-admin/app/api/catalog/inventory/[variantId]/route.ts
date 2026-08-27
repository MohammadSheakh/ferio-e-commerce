import { NextResponse } from "next/server";
import { adminApi } from "@/lib/admin-api";
import { adminApiErrorResponse } from "@/lib/bff-response";

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
    return adminApiErrorResponse(error, "Unable to adjust inventory.");
  }
}
