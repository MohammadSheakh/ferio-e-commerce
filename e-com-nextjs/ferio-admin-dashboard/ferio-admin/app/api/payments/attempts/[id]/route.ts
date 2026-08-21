import { NextResponse } from "next/server";
import { adminApi } from "@/lib/admin-api";
import { adminApiErrorResponse } from "@/lib/bff-response";
import type { PaymentAttemptDetail } from "@/lib/payments";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  try {
    return NextResponse.json({
      data: await adminApi<PaymentAttemptDetail>(
        `/admin/payments/attempts/${encodeURIComponent(params.id)}`,
      ),
    });
  } catch (error) {
    return adminApiErrorResponse(error, "Unable to load payment evidence.");
  }
}
