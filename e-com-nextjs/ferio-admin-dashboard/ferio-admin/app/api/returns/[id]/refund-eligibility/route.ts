import { NextResponse } from "next/server";
import { AdminApiError, adminApi } from "@/lib/admin-api";
import type { RefundEligibility } from "@/lib/returns";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const result = await adminApi<RefundEligibility>(
      `/admin/returns/${params.id}/refund-eligibility`,
    );
    return NextResponse.json({ data: result });
  } catch (error) {
    const status = error instanceof AdminApiError ? error.status : 503;
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Unable to load refund eligibility.",
      },
      { status },
    );
  }
}
