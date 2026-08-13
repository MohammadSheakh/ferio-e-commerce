import { NextResponse } from "next/server";
import { AdminApiError, adminApi } from "@/lib/admin-api";

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
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to retry message." },
      { status: error instanceof AdminApiError ? error.status : 503 },
    );
  }
}
