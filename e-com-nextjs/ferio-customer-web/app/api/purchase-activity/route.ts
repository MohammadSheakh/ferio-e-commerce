import { NextResponse } from "next/server";
import { getPurchaseActivity } from "@/lib/purchase-activity";
import { bffErrorResponse } from "@/lib/bff-response";

export async function GET(request: Request) {
  const search = new URL(request.url).searchParams;
  const page = Number(search.get("page") || 1);
  const limit = Number(search.get("limit") || 10);
  const surface = search.get("surface") || "toast";
  try {
    return NextResponse.json({
      data: await getPurchaseActivity(page, limit, surface),
    });
  } catch {
    return bffErrorResponse(
      "Purchase activity is unavailable.",
      503,
      "SERVICE_UNAVAILABLE",
    );
  }
}
