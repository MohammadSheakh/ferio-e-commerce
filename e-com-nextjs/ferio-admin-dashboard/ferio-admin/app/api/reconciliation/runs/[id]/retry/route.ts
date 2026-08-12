import { NextResponse } from "next/server";
import { AdminApiError, adminApi } from "@/lib/admin-api";

type RetryResult = { runId: string; jobId: string; status: "QUEUED" };

export async function POST(
  _request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const result = await adminApi<RetryResult>(
      `/admin/reconciliation/runs/${params.id}/retry`,
      { method: "POST" },
    );
    return NextResponse.json({ data: result }, { status: 202 });
  } catch (error) {
    const status = error instanceof AdminApiError ? error.status : 503;
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Unable to retry reconciliation run.",
      },
      { status },
    );
  }
}
