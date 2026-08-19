import { NextResponse } from "next/server";
import { AdminApiError, adminApi } from "@/lib/admin-api";

export async function GET() {
  try {
    const stores = await adminApi("/admin/store-locations");
    return NextResponse.json(stores);
  } catch (error) {
    const status = error instanceof AdminApiError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Unable to load store locations.";
    return NextResponse.json({ message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const store = await adminApi("/admin/store-locations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return NextResponse.json(store);
  } catch (error) {
    const status = error instanceof AdminApiError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Unable to create store location.";
    return NextResponse.json({ message }, { status });
  }
}
