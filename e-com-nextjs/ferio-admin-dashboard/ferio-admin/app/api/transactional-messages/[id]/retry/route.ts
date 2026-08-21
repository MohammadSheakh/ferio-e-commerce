import { NextResponse } from "next/server";
import { adminApi } from "@/lib/admin-api";
import { adminApiErrorResponse } from "@/lib/bff-response";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    return NextResponse.json({
      data: await adminApi(`/admin/transactional-messages/${id}/retry`, {
        method: "POST",
      }),
    });
  } catch (error) {
    return adminApiErrorResponse(error, "Unable to retry message.");
  }
}
