import type { Metadata } from "next";
import "./globals.css";
import { cookies } from "next/headers";
import { PLATFORM_TOKEN_COOKIE as PLATFORM_COOKIE_NAME } from "@/lib/platform-session";
import { SideNav } from "./side-nav";

export const metadata: Metadata = {
  title: "Ferio Platform Admin",
  description: "Ferio SaaS control plane",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const authed = !!cookies().get(PLATFORM_COOKIE_NAME)?.value;
  return (
    <html lang="en">
      <body>
        {authed ? (
          <div className="shell">
            <SideNav />
            <main className="main">{children}</main>
          </div>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
