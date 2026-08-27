import { NextResponse } from "next/server";
import { adminApi } from "@/lib/admin-api";
import { adminApiErrorResponse } from "@/lib/bff-response";

async function call(request: Request, path: string[], method: string) {
  try {
    const body =
      method === "GET" || method === "DELETE"
        ? undefined
        : JSON.stringify(await request.json());
    const data = await adminApi(
      `/admin/services${path.length ? `/${path.join("/")}` : ""}`,
      {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body,
      },
    );
    return NextResponse.json({ data });
  } catch (error) {
    return adminApiErrorResponse(error, "Request failed.");
  }
}

export const GET = (request: Request, context: { params: { path: string[] } }) =>
  call(request, context.params.path, "GET");
export const POST = (request: Request, context: { params: { path: string[] } }) =>
  call(request, context.params.path, "POST");
export const PATCH = (request: Request, context: { params: { path: string[] } }) =>
  call(request, context.params.path, "PATCH");
export const DELETE = (request: Request, context: { params: { path: string[] } }) =>
  call(request, context.params.path, "DELETE");
