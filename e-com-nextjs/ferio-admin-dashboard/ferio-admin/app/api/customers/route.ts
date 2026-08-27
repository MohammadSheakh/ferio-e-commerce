import { NextResponse } from "next/server";
import { adminApi } from "@/lib/admin-api";
import { adminApiErrorResponse } from "@/lib/bff-response";
import type { CustomerPage } from "@/lib/customers";

export async function GET(request: Request) {
  try {
    const data = await adminApi<CustomerPage>(
      `/admin/customers${new URL(request.url).search}`,
    );
    return NextResponse.json({ data });
  } catch (error) {
    return adminApiErrorResponse(error, "Unable to load customers.");
  }
}
