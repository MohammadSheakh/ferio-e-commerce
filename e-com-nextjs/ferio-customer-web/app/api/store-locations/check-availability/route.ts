import { NextResponse } from "next/server";

const backendApiUrl =
  process.env.FERIO_API_URL ??
  process.env.NEXT_PUBLIC_FERIO_API_URL ??
  "http://localhost:6733/api/v1";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const res = await fetch(`${backendApiUrl}/store-locations/check-availability`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.message || "Failed to check store availability");
    }
    const data = await res.json();
    return NextResponse.json({ data: data.data || data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to check store availability.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
