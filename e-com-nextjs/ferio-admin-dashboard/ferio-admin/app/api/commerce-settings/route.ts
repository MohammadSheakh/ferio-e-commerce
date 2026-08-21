import { NextResponse } from "next/server";
import { adminApi } from "@/lib/admin-api";
import { adminApiErrorResponse } from "@/lib/bff-response";
import type { CommerceSettings } from "@/lib/commerce-settings";

export async function GET() {
  try {
    const settings = await adminApi<CommerceSettings>(
      "/admin/commerce-settings",
    );
    return NextResponse.json({ data: settings });
  } catch (error) {
    return adminApiErrorResponse(error, "Unable to load commerce settings.");
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const settings = await adminApi<CommerceSettings>(
      "/admin/commerce-settings",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    return NextResponse.json({ data: settings });
  } catch (error) {
    return adminApiErrorResponse(error, "Unable to save commerce settings.");
  }
}
