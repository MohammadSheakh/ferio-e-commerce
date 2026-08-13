import { NextResponse } from "next/server";
import { customerSessionFetch } from "@/lib/customer-session";

async function call(request: Request, method: "GET" | "POST") {
  const body = method === "POST" ? JSON.stringify(await request.json()) : undefined;
  const result = await customerSessionFetch(
    `/account/commerce${method === "POST" ? "/link" : ""}`,
    {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body,
    },
  );
  if (!result) return NextResponse.json({ message: "Sign in to view your account." }, { status: 401 });
  const payload = await result.response.json();
  return NextResponse.json(
    result.response.ok ? { data: payload.data } : { message: Array.isArray(payload.message) ? payload.message.join(" ") : payload.message },
    { status: result.response.status },
  );
}

export const GET = (request: Request) => call(request, "GET");
export const POST = (request: Request) => call(request, "POST");
