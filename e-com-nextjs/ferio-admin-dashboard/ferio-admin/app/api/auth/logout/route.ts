import { NextRequest, NextResponse } from "next/server";
import { getBackendUrl } from "@/lib/backend";

export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get("ferio_admin_refresh")?.value;

  if (refreshToken) {
    try {
      await fetch(getBackendUrl("/auth/logout"), {
        method: "POST",
        headers: {
          Cookie: `refreshToken=${refreshToken}`,
        },
        cache: "no-store",
      });
    } catch {}
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set("ferio_admin_access", "", { maxAge: 0, path: "/" });
  response.cookies.set("ferio_admin_refresh", "", { maxAge: 0, path: "/" });
  return response;
}
