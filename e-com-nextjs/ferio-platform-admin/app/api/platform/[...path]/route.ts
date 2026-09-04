import { NextResponse } from "next/server";
import { platformApi } from "@/lib/platform-session";

/**
 * Single catch-all BFF for the control plane. The operator's token stays in
 * an httpOnly cookie; this route attaches it server-side and never exposes
 * it to client JavaScript.
 */
async function handle(request: Request, method: "GET" | "POST" | "PATCH") {
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api\/platform/, "");
  const backendPath = `/platform${path}`;
  try {
    let body: string | undefined;
    if (method !== "GET") {
      body = await request.text();
    }
    const query = url.search;
    const data = await platformApi(`${backendPath}${query}`, {
      method,
      ...(body ? { body, headers: { "Content-Type": "application/json" } } : {}),
    });
    return NextResponse.json({ data });
  } catch (error) {
    const status =
      (error as { status?: number }).status ?? 502;
    return NextResponse.json(
      { message: (error as Error).message || "Control plane unavailable." },
      { status },
    );
  }
}

export const GET = (request: Request) => handle(request, "GET");
export const POST = (request: Request) => handle(request, "POST");
export const PATCH = (request: Request) => handle(request, "PATCH");
