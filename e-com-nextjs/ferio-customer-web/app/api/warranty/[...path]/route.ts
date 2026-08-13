import { NextResponse } from "next/server";
import { customerSessionFetch } from "@/lib/customer-session";

async function call(
  request: Request,
  path: string[],
  method: "GET" | "POST",
) {
  const multipart = request.headers.get("content-type")?.includes("multipart/form-data");
  const body = method === "GET" ? undefined : multipart ? await request.formData() : JSON.stringify(await request.json());
  const result = await customerSessionFetch(`/warranty/${path.join("/")}`, {
    method,
    headers: !multipart && body ? { "Content-Type": "application/json" } : undefined,
    body,
  });
  if (!result) return NextResponse.json({ message: "Sign in to use warranty claims." }, { status: 401 });
  const payload = await result.response.json();
  return NextResponse.json(
    result.response.ok ? { data: payload.data } : { message: Array.isArray(payload.message) ? payload.message.join(" ") : payload.message },
    { status: result.response.status },
  );
}

export const GET = (request: Request, context: { params: { path: string[] } }) => call(request, context.params.path, "GET");
export const POST = (request: Request, context: { params: { path: string[] } }) => call(request, context.params.path, "POST");
