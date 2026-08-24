import type { Metadata } from "next";
import "./globals.css";
import { cookies } from "next/headers";
import { PLATFORM_TOKEN_COOKIE as PLATFORM_COOKIE_NAME } from "@/lib/platform-session";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Ferio Platform Admin",
  description: "Ferio SaaS control plane",
};

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/organizations", label: "Organizations" },
  { href: "/plans", label: "Plans" },
  { href: "/support-access", label: "Support Access" },
];

function SideNav() {
  const path = typeof window === "undefined" ? "/" : "/";
  return (
    <nav className="side">
      <p className="eyebrow">Ferio Platform</p>
      <div style={{ height: 12 }} />
      {NAV.map((item) => (
        <Link key={item.href} href={item.href} className={item.href === path ? "active" : ""}>
          {item.label}
        </Link>
      ))}
      <div style={{ flex: 1 }} />
      <form action="/api/auth/logout" method="post">
        <button className="pill" style={{ background: "#ffffff", color: "#111114", border: "1px solid #e8e8ea" }}>
          Sign out
        </button>
      </form>
    </nav>
  );
}

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
