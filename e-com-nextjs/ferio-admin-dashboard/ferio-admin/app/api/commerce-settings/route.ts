import { NextResponse } from "next/server";
import { AdminApiError, adminApi } from "@/lib/admin-api";
import type { CommerceSettings } from "@/lib/commerce-settings";

function errorResponse(error: unknown, fallback: string) {
  const status = error instanceof AdminApiError ? error.status : 503;
  const message = error instanceof Error ? error.message : fallback;
  return NextResponse.json({ message }, { status });
}

export async function GET() {
  try {
    const settings = await adminApi<CommerceSettings>(
      "/admin/commerce-settings",
    );
    return NextResponse.json({ data: settings });
  } catch (error) {
    return errorResponse(error, "Unable to load commerce settings.");
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
    return errorResponse(error, "Unable to save commerce settings.");
  }
}
