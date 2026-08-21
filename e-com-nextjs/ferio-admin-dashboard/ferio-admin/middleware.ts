import { NextRequest, NextResponse } from "next/server";

const backendApiUrl =
  process.env.FERIO_API_URL ?? "http://localhost:6733/api/v1";

function isExpired(token: string): boolean {
  try {
    const segment = token.split(".")[1];
    const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const payload = JSON.parse(
      atob(padded),
    ) as { exp?: number };
    return !payload.exp || payload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

function extractRefreshToken(setCookie: string | null): string | null {
  return setCookie?.match(/(?:^|,\s*)refreshToken=([^;]+)/)?.[1] ?? null;
}

async function refreshSession(
  request: NextRequest,
): Promise<NextResponse | null> {
  const refreshToken = request.cookies.get("ferio_admin_refresh")?.value;
  if (!refreshToken) return null;

  try {
    const upstream = await fetch(`${backendApiUrl}/auth/refresh`, {
      method: "POST",
      headers: { Cookie: `refreshToken=${refreshToken}` },
      cache: "no-store",
    });
    const payload = (await upstream.json()) as {
      data?: { accessToken?: string };
    };
    const nextRefreshToken = extractRefreshToken(
      upstream.headers.get("set-cookie"),
    );

    if (!upstream.ok || !payload.data?.accessToken || !nextRefreshToken) {
      return null;
    }

    request.cookies.set("ferio_admin_access", payload.data.accessToken);
    request.cookies.set("ferio_admin_refresh", nextRefreshToken);
    const response = NextResponse.next({
      request: { headers: request.headers },
    });
    const secure = process.env.NODE_ENV === "production";
    response.cookies.set("ferio_admin_access", payload.data.accessToken, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      maxAge: 15 * 60,
      path: "/",
    });
    response.cookies.set("ferio_admin_refresh", nextRefreshToken, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });
    return response;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const accessToken = request.cookies.get("ferio_admin_access")?.value;
  const isDashboard = request.nextUrl.pathname.startsWith("/dashboard");

  if (isDashboard && (!accessToken || isExpired(accessToken))) {
    const refreshedResponse = await refreshSession(request);
    if (refreshedResponse) return refreshedResponse;

    const loginUrl = new URL("/", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.set("ferio_admin_access", "", { maxAge: 0, path: "/" });
    response.cookies.set("ferio_admin_refresh", "", { maxAge: 0, path: "/" });
    return response;
  }

  if (request.nextUrl.pathname === "/" && accessToken && !isExpired(accessToken)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/dashboard/:path*"],
};
