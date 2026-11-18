"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/organizations", label: "Organizations" },
  { href: "/subscriptions", label: "Subscriptions" },
  { href: "/plans", label: "Plans" },
  { href: "/billing", label: "Billing" },
  { href: "/database-health", label: "Database Health" },
  { href: "/system-health", label: "System Health" },
  { href: "/feature-flags", label: "Feature Flags" },
  { href: "/domain-health", label: "Domain Health" },
  { href: "/migrations", label: "Migrations" },
  { href: "/support-access", label: "Support Access" },
];

export function SideNav() {
  const pathname = usePathname();

  return (
    <nav className="side">
      <p className="eyebrow">Ferio Platform</p>
      <div style={{ height: 12 }} />
      {NAV.map((item) => {
        const active =
          item.href === "/"
            ? pathname === "/"
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={active ? "active" : ""}
          >
            {item.label}
          </Link>
        );
      })}
      <div style={{ flex: 1 }} />
      <form action="/api/auth/logout" method="post">
        <button
          className="pill"
          style={{
            background: "#ffffff",
            color: "#111114",
            border: "1px solid #e8e8ea",
          }}
        >
          Sign out
        </button>
      </form>
    </nav>
  );
}

