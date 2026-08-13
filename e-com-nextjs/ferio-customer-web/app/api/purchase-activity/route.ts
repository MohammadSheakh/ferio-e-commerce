import { NextResponse } from "next/server";
import { getPurchaseActivity } from "@/lib/purchase-activity";

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
    return NextResponse.json({ message: "Purchase activity is unavailable." }, { status: 503 });
  }
}
