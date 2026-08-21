import { NextResponse } from "next/server";
import { adminApi } from "@/lib/admin-api";
import { adminApiErrorResponse } from "@/lib/bff-response";
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
    return adminApiErrorResponse(error, "Unable to load customer.");
  }
}
