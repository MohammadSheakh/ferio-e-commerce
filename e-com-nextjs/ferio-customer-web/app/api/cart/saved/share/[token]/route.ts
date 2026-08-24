import { NextResponse } from "next/server";
import { backendApiUrl } from "@/lib/customer-session";
import { withCorrelationId } from "@/lib/correlation";

export async function GET(
  _req: Request,
  { params }: { params: { token: string } },
) {
  try {
    const res = await fetch(
      `${backendApiUrl}/cart/saved/share/${params.token}`,
      {
        headers: withCorrelationId({ Accept: "application/json" }),
        cache: "no-store",
      },
    );
    const payload = await res.json();
    return NextResponse.json(payload, { status: res.status });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Failed to fetch shared cart." },
      { status: 500 },
    );
  }
}
