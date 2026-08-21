import { NextResponse } from "next/server";
import { adminApi } from "@/lib/admin-api";
import { adminApiErrorResponse } from "@/lib/bff-response";

export async function GET() {
  try {
    return NextResponse.json({
      data: await adminApi("/admin/abandoned-carts/eligible"),
    });
  } catch (error) {
    return adminApiErrorResponse(error, "Unable to load abandoned-cart eligibility.");
  }
}
