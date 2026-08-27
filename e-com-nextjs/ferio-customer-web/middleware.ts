import { NextRequest, NextResponse } from "next/server";

const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);

function firstHeaderValue(value: string | null) {
  return value?.split(",", 1)[0]?.trim() || null;
}

function requestOrigin(request: NextRequest) {
  const host =
    firstHeaderValue(request.headers.get("x-forwarded-host")) ??
    firstHeaderValue(request.headers.get("host"));
  const forwardedProtocol = firstHeaderValue(
    request.headers.get("x-forwarded-proto"),
  );
  const protocol =
    forwardedProtocol === "http" || forwardedProtocol === "https"
      ? forwardedProtocol
      : request.nextUrl.protocol.replace(":", "");

  if (!host) return request.nextUrl.origin;

  try {
    return new URL(`${protocol}://${host}`).origin;
  } catch {
    return request.nextUrl.origin;
  }
}

export function middleware(request: NextRequest) {
  if (safeMethods.has(request.method)) return NextResponse.next();

  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  const allowed = origin
    ? origin === requestOrigin(request)
    : fetchSite === "same-origin";

  if (allowed) return NextResponse.next();

  return NextResponse.json(
    { message: "Cross-site request blocked." },
    {
      status: 403,
      headers: {
        "Cache-Control": "no-store",
        Vary: "Origin, Sec-Fetch-Site",
      },
    },
  );
}

export const config = {
  matcher: "/api/:path*",
};
