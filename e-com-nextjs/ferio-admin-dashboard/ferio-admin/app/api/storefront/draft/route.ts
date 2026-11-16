import { NextResponse } from "next/server";
import { adminApi } from "@/lib/admin-api";
import { adminApiErrorResponse } from "@/lib/bff-response";

export async function GET() {
  try {
    const page = await adminApi("/admin/storefront/pages/home/draft");
    return NextResponse.json({ data: page });
  } catch (error) {
    return adminApiErrorResponse(error, "Unable to load storefront draft.");
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const page = await adminApi("/admin/storefront/pages/home/draft", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return NextResponse.json({ data: page });
  } catch (error) {
    return adminApiErrorResponse(error, "Unable to save storefront draft.");
  }
}

