import { NextResponse } from "next/server";
import { AdminApiError, adminApi } from "@/lib/admin-api";
import type { CustomerDetail } from "@/lib/customers";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  try {
    return NextResponse.json({
      data: await adminApi<CustomerDetail>(`/admin/customers/${params.id}`),
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to load customer." },
      { status: error instanceof AdminApiError ? error.status : 503 },
    );
  }
}
