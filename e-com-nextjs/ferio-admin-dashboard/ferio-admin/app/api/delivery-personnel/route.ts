import { NextResponse } from "next/server";
import { adminApi } from "@/lib/admin-api";
import { adminApiErrorResponse } from "@/lib/bff-response";

export async function GET(request: Request) {
  try {
    const data = await adminApi(
      `/delivery-personnel/admin/list${new URL(request.url).search}`,
    );
    return NextResponse.json({ data });
  } catch (error) {
    return adminApiErrorResponse(error, "Unable to load delivery personnel.");
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = await adminApi("/delivery-personnel/admin/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return NextResponse.json({ data });
  } catch (error) {
    return adminApiErrorResponse(error, "Unable to create delivery personnel.");
  }
}
