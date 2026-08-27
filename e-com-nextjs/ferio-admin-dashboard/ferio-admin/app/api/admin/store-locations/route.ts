import { NextResponse } from "next/server";
import { adminApi } from "@/lib/admin-api";
import { adminApiErrorResponse } from "@/lib/bff-response";

export async function GET() {
  try {
    const stores = await adminApi("/admin/store-locations");
    return NextResponse.json(stores);
  } catch (error) {
    return adminApiErrorResponse(error, "Unable to load store locations.");
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
    return adminApiErrorResponse(error, "Unable to create store location.");
  }
}
