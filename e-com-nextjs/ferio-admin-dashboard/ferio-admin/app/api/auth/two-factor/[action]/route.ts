import { NextResponse } from "next/server";
import { adminApi } from "@/lib/admin-api";
import { adminApiErrorResponse, bffErrorResponse } from "@/lib/bff-response";

export async function POST(request: Request, context: { params: { action: string } }) {
  if (!["setup", "confirm", "disable"].includes(context.params.action)) return bffErrorResponse("Unknown two-factor action.", 404, "NOT_FOUND");
  try {
    const body = await request.json().catch(() => ({}));
    return NextResponse.json({ data: await adminApi(`/auth/admin/2fa/${context.params.action}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }) });
  } catch (error) { return adminApiErrorResponse(error, "Unable to update two-factor settings."); }
}
