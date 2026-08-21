import { NextResponse } from "next/server";
import { adminApi } from "@/lib/admin-api";
import { adminApiErrorResponse } from "@/lib/bff-response";

export async function POST(
  _request: Request,
  { params }: { params: { id: string } },
) {
  try {
    return NextResponse.json({
      data: await adminApi(`/admin/shipping/webhooks/${params.id}/retry`, {
        method: "POST",
      }),
    });
  } catch (error) {
    return adminApiErrorResponse(error, "Unable to queue callback retry.");
  }
}
