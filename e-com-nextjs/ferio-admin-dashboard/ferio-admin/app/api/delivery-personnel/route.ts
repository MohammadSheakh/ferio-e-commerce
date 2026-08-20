import { NextResponse } from "next/server";
import { AdminApiError, adminApi } from "@/lib/admin-api";

export async function GET(request: Request) {
  try {
    const data = await adminApi(
      `/delivery-personnel/admin/list${new URL(request.url).search}`,
    );
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to load delivery personnel." },
      { status: error instanceof AdminApiError ? error.status : 503 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = await adminApi("/delivery-personnel/admin/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to create delivery personnel." },
      { status: error instanceof AdminApiError ? error.status : 503 },
    );
  }
}
