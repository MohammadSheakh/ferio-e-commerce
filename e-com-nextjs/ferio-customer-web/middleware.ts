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

function redirectToHttps(request: NextRequest): NextResponse | null {
  if (process.env.NODE_ENV !== "production") return null;
  if (!safeMethods.has(request.method)) return null;
  const forwardedProtocol = firstHeaderValue(
    request.headers.get("x-forwarded-proto"),
  );
  if (forwardedProtocol !== "http") return null;

  const url = request.nextUrl.clone();
  url.protocol = "https:";
  return NextResponse.redirect(url, 308);
}

export function middleware(request: NextRequest) {
  const httpsRedirect = redirectToHttps(request);
  if (httpsRedirect) return httpsRedirect;

  if (!request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

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
  matcher: "/:path*",
};
