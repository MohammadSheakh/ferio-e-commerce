import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE = "ferio_platform_token";

/**
 * Platform console gate: unauthenticated visitors land on /login.
 * Same-origin enforcement for mutations mirrors the tenant apps.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/login") return NextResponse.next();

  if (!request.cookies.get(COOKIE)?.value) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (["POST", "PATCH", "PUT", "DELETE"].includes(request.method)) {
    const origin = request.headers.get("origin");
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    if (origin && host && new URL(origin).host !== host) {
      return new NextResponse("Cross-origin mutation rejected", { status: 403 });
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
