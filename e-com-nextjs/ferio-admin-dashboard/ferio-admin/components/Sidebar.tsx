"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import LogoutButton from "@/components/LogoutButton";

const links = [
  { href: "/dashboard", label: "Overview", icon: "📊" },
  { href: "/dashboard/orders", label: "Orders", icon: "📦" },
  { href: "/dashboard/payments", label: "Payments", icon: "💳" },
  { href: "/dashboard/returns", label: "Returns", icon: "↩️" },
  { href: "/dashboard/warranty", label: "Warranty", icon: "🛡️" },
  { href: "/dashboard/products", label: "Products", icon: "🏷️" },
  { href: "/dashboard/services", label: "Services", icon: "🛠️" },
  { href: "/dashboard/inventory", label: "Inventory", icon: "📋" },
  { href: "/dashboard/delivery", label: "Delivery", icon: "🚚" },
  { href: "/dashboard/shipping", label: "Shipping", icon: "⛵" },
  { href: "/dashboard/messages", label: "Messages", icon: "💬" },
  { href: "/dashboard/chat", label: "Live Chat", icon: "⚡" },
  { href: "/dashboard/purchase-activity", label: "Global order history", icon: "📜" },
  { href: "/dashboard/audit", label: "Audit", icon: "🔍" },
  { href: "/dashboard/reconciliation", label: "Reconciliation", icon: "⚖️" },
  { href: "/dashboard/reports", label: "Reports", icon: "📈" },
  { href: "/dashboard/settings", label: "Settings", icon: "⚙️" },
  { href: "/dashboard/hero-showcase", label: "Hero Showcase", icon: "✨" },
  { href: "/dashboard/customers", label: "Customers", icon: "👥" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [isMounted, setIsMounted] = useState<boolean>(false);

  useEffect(() => {
    setIsMounted(true);
    const saved = localStorage.getItem("ferio_admin_sidebar_collapsed");
    if (saved !== null) {
      setIsCollapsed(saved === "true");
    }
  }, []);

  const toggleSidebar = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("ferio_admin_sidebar_collapsed", String(next));
      return next;
    });
  };

  return (
    <aside
      className={`relative flex h-screen flex-col border-r border-line bg-paper transition-all duration-300 ease-in-out shrink-0 select-none ${
        isCollapsed ? "w-[68px]" : "w-56"
      }`}
    >
      {/* Header with Logo & Toggle Button */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-line/60">
        {!isCollapsed ? (
          <div className="flex items-center gap-2 px-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-ink text-white font-bold text-[14px]">
              F
            </span>
            <span className="text-[15px] font-semibold tracking-tight text-ink">
              Ferio Admin
            </span>
          </div>
        ) : (
          <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-md bg-ink text-white font-bold text-[14px]">
            F
          </div>
        )}

        <button
          type="button"
          onClick={toggleSidebar}
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          className={`flex h-7 w-7 items-center justify-center rounded-md border border-line bg-white text-ink2 hover:text-ink hover:bg-surface transition ${
            isCollapsed ? "mt-2 mx-auto" : ""
          }`}
        >
          <svg
            className={`h-4 w-4 transition-transform duration-300 ${
              isCollapsed ? "rotate-180" : ""
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
            />
          </svg>
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto space-y-1 p-2 custom-scrollbar">
        {links.map((l) => {
          const active =
            l.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(l.href);

          return (
            <Link
              key={l.href}
              href={l.href}
              title={isCollapsed ? l.label : undefined}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-[13px] transition ${
                isCollapsed ? "justify-center px-2 py-2.5" : ""
              } ${
                active
                  ? "bg-surface text-ink font-semibold shadow-xs"
                  : "text-ink2 hover:text-ink hover:bg-surface/50"
              }`}
            >
              <span className="text-[14px] shrink-0">{l.icon}</span>
              {!isCollapsed && (
                <span className="truncate transition-opacity duration-200">
                  {l.label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Sidebar Footer with Logout Button */}
      <div className="border-t border-line p-3 flex items-center justify-between">
        {!isCollapsed ? (
          <div className="w-full px-2">
            <LogoutButton />
          </div>
        ) : (
          <div className="mx-auto" title="Sign Out">
            <LogoutButton isCollapsed />
          </div>
        )}
      </div>
    </aside>
  );
}
