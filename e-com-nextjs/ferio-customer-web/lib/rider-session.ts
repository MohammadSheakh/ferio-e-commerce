import { cookies } from "next/headers";

export const RIDER_TOKEN_COOKIE = "ferio_rider_token";

/**
 * Rider sessions live in an httpOnly cookie set by the login BFF route.
 * The raw JWT is never exposed to client JavaScript: one XSS in the rider
 * portal must not hand over the rider credential.
 */
export async function riderTokenFromCookie(): Promise<string | null> {
  const token = cookies().get(RIDER_TOKEN_COOKIE)?.value;
  return token ? `Bearer ${token}` : null;
}

export function riderSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 7 * 24 * 60 * 60,
    path: "/",
  };
}
