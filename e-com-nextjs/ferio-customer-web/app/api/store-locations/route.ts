import { NextResponse } from "next/server";

const backendApiUrl =
  process.env.FERIO_API_URL ??
  process.env.NEXT_PUBLIC_FERIO_API_URL ??
  "http://localhost:6733/api/v1";

export async function GET() {
  try {
    const res = await fetch(`${backendApiUrl}/store-locations`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Failed to fetch store locations");
    const data = await res.json();
    return NextResponse.json({ data: data.data || data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load store locations.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
