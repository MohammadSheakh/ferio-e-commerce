import { NextResponse } from "next/server";
import { adminApi } from "@/lib/admin-api";
import { adminApiErrorResponse } from "@/lib/bff-response";

async function call(request: Request, path: string[], method: string) {
  try {
    const body = JSON.stringify(await request.json().catch(() => ({})));
    const data = await adminApi(`/admin/staff/${path.join("/")}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body,
    });
    return NextResponse.json({ data });
  } catch (error) {
    return adminApiErrorResponse(error, "Unable to update staff access.");
  }
}

export const POST = (
  request: Request,
  context: { params: { path: string[] } },
) => call(request, context.params.path, "POST");

export const PATCH = (
  request: Request,
  context: { params: { path: string[] } },
) => call(request, context.params.path, "PATCH");
