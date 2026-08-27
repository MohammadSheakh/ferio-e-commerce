import { NextResponse } from "next/server";
import { adminApi } from "@/lib/admin-api";
import { adminApiErrorResponse } from "@/lib/bff-response";
import type { RefundEligibility } from "@/lib/returns";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const result = await adminApi<RefundEligibility>(
      `/admin/returns/${params.id}/refund-eligibility`,
    );
    return NextResponse.json({ data: result });
  } catch (error) {
    return adminApiErrorResponse(error, "Unable to load refund eligibility.");
  }
}
