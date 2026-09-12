import { NextResponse } from "next/server";
import { adminApi } from "@/lib/admin-api";
import { adminApiErrorResponse } from "@/lib/bff-response";

export async function GET(request: Request) {
  try {
    const result = await adminApi(
      `/product-requests${new URL(request.url).search}`,
    );
    return NextResponse.json(result);
  } catch (error) {
    return adminApiErrorResponse(error, "Unable to load product requests.");
  }
}
