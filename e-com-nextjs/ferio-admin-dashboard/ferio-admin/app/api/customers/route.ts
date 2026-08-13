import { NextResponse } from "next/server";
import { AdminApiError, adminApi } from "@/lib/admin-api";
import type { CustomerPage } from "@/lib/customers";

export async function GET(request: Request) {
  try {
    const data = await adminApi<CustomerPage>(
      `/admin/customers${new URL(request.url).search}`,
    );
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to load customers." },
      { status: error instanceof AdminApiError ? error.status : 503 },
    );
  }
}
