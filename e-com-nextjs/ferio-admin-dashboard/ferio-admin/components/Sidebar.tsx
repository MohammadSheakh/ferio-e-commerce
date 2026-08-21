"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import LogoutButton from "@/components/LogoutButton";
import type { AdminSession } from "@/lib/admin-session";

const links = [
  { href: "/dashboard", label: "Overview", staffVisible: true },
  {
    href: "/dashboard/orders",
    label: "Orders",
    permission: "orders.read",
  },
  {
    href: "/dashboard/payments",
    label: "Payments",
    permission: "payments.read",
  },
  {
    href: "/dashboard/returns",
    label: "Returns",
    permission: "returns.read",
  },
  {
    href: "/dashboard/warranty",
    label: "Warranty",
    permission: "warranty.read",
  },
  {
    href: "/dashboard/products",
    label: "Products",
    permission: "catalog.read",
  },
  {
    href: "/dashboard/requested-products",
    label: "Requested Products",
    permission: "product-content.read",
  },
  {
    href: "/dashboard/feedback",
    label: "Suggestions & Feedback",
    permission: "product-content.read",
  },
  {
    href: "/dashboard/services",
    label: "Services",
    permission: "services.read",
  },
  {
    href: "/dashboard/inventory",
    label: "Inventory",
    permission: "catalog.read",
  },
  {
    href: "/dashboard/stores",
    label: "Store Outlets",
    permission: "store-locations.read",
  },
  {
    href: "/dashboard/delivery",
    label: "Delivery Zones",
    permission: "delivery-zones.read",
  },
  {
    href: "/dashboard/delivery-men",
    label: "Delivery Personnel",
    permission: "delivery-personnel.read",
  },
  {
    href: "/dashboard/delivery-map",
    label: "Live Delivery Map",
    permission: "delivery-personnel.read",
  },
  {
    href: "/dashboard/shipping",
    label: "Shipping",
    permission: "shipping.read",
  },
  {
    href: "/dashboard/messages",
    label: "Messages",
    permission: "messaging.read",
  },
  {
    href: "/dashboard/abandoned-carts",
    label: "Abandoned Carts",
    permission: "messaging.read",
  },
  {
    href: "/dashboard/chat",
    label: "Live Chat",
    permission: "chat.read",
  },
  {
    href: "/dashboard/purchase-activity",
    label: "Global order history",
    permission: "purchase-activity.read",
  },
  {
    href: "/dashboard/audit",
    label: "Audit",
    permission: "audit.read",
  },
  {
    href: "/dashboard/staff",
    label: "Staff Access",
    ownerOnly: true,
  },
  {
    href: "/dashboard/security",
    label: "Security",
    staffVisible: true,
  },
  {
    href: "/dashboard/reconciliation",
    label: "Reconciliation",
    permission: "reconciliation.read",
  },
  {
    href: "/dashboard/operations-health",
    label: "System Health",
    permission: "reconciliation.read",
  },
  {
    href: "/dashboard/reports",
    label: "Reports",
    permission: "reports.read",
  },
  {
    href: "/dashboard/settings",
    label: "Settings",
    permission: "settings.read",
  },
  {
    href: "/dashboard/hero-showcase",
    label: "Hero Showcase",
    permission: "product-content.read",
  },
  {
    href: "/dashboard/customers",
    label: "Customers",
    permission: "customers.read",
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [session, setSession] = useState<AdminSession | null>();

  useEffect(() => {
    void fetch("/api/auth/session", { cache: "no-store" })
      .then(async (response) => {
        const payload = (await response.json()) as { data?: AdminSession };
        setSession(response.ok && payload.data ? payload.data : null);
      })
      .catch(() => setSession(null));
  }, []);

  const visibleLinks = links.filter((link) => {
    if (session === undefined) return false;
    if (!session || session.role === "admin") return true;
    if (link.ownerOnly) return false;
    if (link.staffVisible) return true;
    return Boolean(
      link.permission && session.permissions.includes(link.permission),
    );
  });

  return (
    <aside className="sticky top-0 z-30 flex h-screen w-56 shrink-0 select-none flex-col border-r border-line bg-paper">
      <div className="border-b border-line px-5 py-5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-ink text-[14px] font-bold text-white">
            F
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-ink">
            Ferio Admin
          </span>
        </div>
      </div>

      <nav
        aria-label="Admin navigation"
        className="custom-scrollbar flex-1 space-y-1 overflow-y-auto p-2"
      >
        {visibleLinks.map((l) => {
          const active =
            l.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(l.href);

          return (
            <Link
              key={l.href}
              href={l.href}
              aria-current={active ? "page" : undefined}
              className={`block rounded-md px-3 py-2 text-[13px] transition ${
                active
                  ? "bg-surface font-medium text-ink"
                  : "text-ink2 hover:bg-surface/50 hover:text-ink"
              }`}
            >
              <span className="block truncate">{l.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-line p-3">
        <div className="w-full px-2">
          <LogoutButton />
        </div>
      </div>
    </aside>
  );
}
