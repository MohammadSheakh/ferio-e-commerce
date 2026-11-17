import { NextRequest, NextResponse } from "next/server";
import { tenantHostFromHeaders } from "./lib/host-forward";

const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);

function firstHeaderValue(value: string | null) {
  return value?.split(",", 1)[0]?.trim() || null;
}

function requestOrigin(request: NextRequest) {
  const host = tenantHostFromHeaders(request.headers);
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

function buildCspHeader(request: NextRequest): string {
  const origins = new Set<string>([
    "'self'",
    "https://*.sheakh.qzz.io",
    "https://*.qzz.io",
    "https://adminf.sheakh.qzz.io",
    "http://localhost:*",
    "http://127.0.0.1:*",
  ]);

  const referer = request.headers.get("referer");
  if (referer) {
    try {
      const parsed = new URL(referer);
      origins.add(parsed.origin);
    } catch {
      // ignore invalid referer
    }
  }

  return `frame-ancestors ${Array.from(origins).join(" ")};`;
}

function applySecurityHeaders(request: NextRequest, response: NextResponse): NextResponse {
  response.headers.set("Content-Security-Policy", buildCspHeader(request));
  response.headers.delete("X-Frame-Options");
  return response;
}

export function middleware(request: NextRequest) {
  const httpsRedirect = redirectToHttps(request);
  if (httpsRedirect) return httpsRedirect;

  if (!request.nextUrl.pathname.startsWith("/api/")) {
    const response = NextResponse.next();
    return applySecurityHeaders(request, response);
  }

  if (safeMethods.has(request.method)) {
    const response = NextResponse.next();
    return applySecurityHeaders(request, response);
  }

  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  const allowed = origin
    ? origin === requestOrigin(request)
    : fetchSite === "same-origin";

  if (allowed) {
    const response = NextResponse.next();
    return applySecurityHeaders(request, response);
  }

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
