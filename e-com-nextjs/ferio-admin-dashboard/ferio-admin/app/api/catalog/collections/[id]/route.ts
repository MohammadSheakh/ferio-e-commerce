import { NextResponse } from "next/server";
import { adminApi } from "@/lib/admin-api";
import { adminApiErrorResponse } from "@/lib/bff-response";

interface Params {
  params: { id: string };
}

export async function GET(_req: Request, { params }: Params) {
  try {
    const result = await adminApi(`/admin/storefront/collections/${params.id}`);
    return NextResponse.json({ data: result });
  } catch (error) {
    return adminApiErrorResponse(error, "Unable to load collection.");
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const body = await request.json();
    const result = await adminApi(`/admin/storefront/collections/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return NextResponse.json({ data: result });
  } catch (error) {
    return adminApiErrorResponse(error, "Unable to update collection.");
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const result = await adminApi(`/admin/storefront/collections/${params.id}`, {
      method: "DELETE",
    });
    return NextResponse.json({ data: result });
  } catch (error) {
    return adminApiErrorResponse(error, "Unable to delete collection.");
  }
}

