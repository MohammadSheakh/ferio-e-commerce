import { NextResponse } from "next/server";
import { adminApi } from "@/lib/admin-api";
import { adminApiErrorResponse } from "@/lib/bff-response";

export async function GET() {
  try {
    return NextResponse.json({ data: await adminApi("/admin/services") });
  } catch (error) {
    return adminApiErrorResponse(error, "Unable to load services.");
  }
}

export async function POST(request: Request) {
  try {
    return NextResponse.json({
      data: await adminApi("/admin/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(await request.json()),
      }),
    });
  } catch (error) {
    return adminApiErrorResponse(error, "Unable to create service.");
  }
}
