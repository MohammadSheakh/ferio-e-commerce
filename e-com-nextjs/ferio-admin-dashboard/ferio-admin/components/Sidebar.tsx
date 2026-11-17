"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import LogoutButton from "@/components/LogoutButton";
import type { AdminSession } from "@/lib/admin-session";

type SidebarLink = {
  href: string;
  label: string;
  permission?: string;
  entitlement?: string;
  staffVisible?: boolean;
  ownerOnly?: boolean;
  borderClass: string;
  hoverClass: string;
  activeClass: string;
};

const links: SidebarLink[] = [
  // Overview (Slate / Neutral)
  {
    href: "/dashboard",
    label: "Overview",
    staffVisible: true,
    borderClass: "border-l-slate-400 border-r-slate-400",
    hoverClass: "hover:bg-slate-100/70 text-slate-800",
    activeClass: "bg-slate-900 text-white font-semibold border-l-slate-900 border-r-slate-900",
  },

  // Sales & Orders (Amber / Gold)
  {
    href: "/dashboard/orders",
    label: "Orders",
    permission: "orders.read",
    borderClass: "border-l-amber-500 border-r-amber-500",
    hoverClass: "hover:bg-amber-50 text-amber-950",
    activeClass: "bg-amber-500 text-white font-semibold border-l-amber-600 border-r-amber-600",
  },
  {
    href: "/dashboard/payments",
    label: "Payments",
    permission: "payments.read",
    entitlement: "online_payments",
    borderClass: "border-l-amber-500 border-r-amber-500",
    hoverClass: "hover:bg-amber-50 text-amber-950",
    activeClass: "bg-amber-500 text-white font-semibold border-l-amber-600 border-r-amber-600",
  },
  {
    href: "/dashboard/wallet",
    label: "Customer Wallets",
    permission: "wallets.read",
    entitlement: "customer_wallet",
    borderClass: "border-l-amber-500 border-r-amber-500",
    hoverClass: "hover:bg-amber-50 text-amber-950",
    activeClass: "bg-amber-500 text-white font-semibold border-l-amber-600 border-r-amber-600",
  },
  {
    href: "/dashboard/returns",
    label: "Returns",
    permission: "returns.read",
    entitlement: "returns_rto",
    borderClass: "border-l-amber-500 border-r-amber-500",
    hoverClass: "hover:bg-amber-50 text-amber-950",
    activeClass: "bg-amber-500 text-white font-semibold border-l-amber-600 border-r-amber-600",
  },
  {
    href: "/dashboard/warranty",
    label: "Warranty",
    permission: "warranty.read",
    entitlement: "warranty_management",
    borderClass: "border-l-amber-500 border-r-amber-500",
    hoverClass: "hover:bg-amber-50 text-amber-950",
    activeClass: "bg-amber-500 text-white font-semibold border-l-amber-600 border-r-amber-600",
  },

  // Catalog & Customers (Emerald / Green)
  {
    href: "/dashboard/products",
    label: "Products",
    permission: "catalog.read",
    borderClass: "border-l-emerald-500 border-r-emerald-500",
    hoverClass: "hover:bg-emerald-50 text-emerald-950",
    activeClass: "bg-emerald-600 text-white font-semibold border-l-emerald-700 border-r-emerald-700",
  },
  {
    href: "/dashboard/collections",
    label: "Collections",
    permission: "catalog.read",
    borderClass: "border-l-emerald-500 border-r-emerald-500",
    hoverClass: "hover:bg-emerald-50 text-emerald-950",
    activeClass: "bg-emerald-600 text-white font-semibold border-l-emerald-700 border-r-emerald-700",
  },
  {
    href: "/dashboard/inventory",
    label: "Inventory",
    permission: "catalog.read",
    entitlement: "inventory",
    borderClass: "border-l-emerald-500 border-r-emerald-500",
    hoverClass: "hover:bg-emerald-50 text-emerald-950",
    activeClass: "bg-emerald-600 text-white font-semibold border-l-emerald-700 border-r-emerald-700",
  },
  {
    href: "/dashboard/customers",
    label: "Customers",
    permission: "customers.read",
    borderClass: "border-l-emerald-500 border-r-emerald-500",
    hoverClass: "hover:bg-emerald-50 text-emerald-950",
    activeClass: "bg-emerald-600 text-white font-semibold border-l-emerald-700 border-r-emerald-700",
  },
  {
    href: "/dashboard/services",
    label: "Services",
    permission: "services.read",
    entitlement: "service_booking",
    borderClass: "border-l-emerald-500 border-r-emerald-500",
    hoverClass: "hover:bg-emerald-50 text-emerald-950",
    activeClass: "bg-emerald-600 text-white font-semibold border-l-emerald-700 border-r-emerald-700",
  },
  {
    href: "/dashboard/stores",
    label: "Store Outlets",
    permission: "store-locations.read",
    entitlement: "store_pickup",
    borderClass: "border-l-emerald-500 border-r-emerald-500",
    hoverClass: "hover:bg-emerald-50 text-emerald-950",
    activeClass: "bg-emerald-600 text-white font-semibold border-l-emerald-700 border-r-emerald-700",
  },

  // Logistics & Delivery (Blue)
  {
    href: "/dashboard/delivery",
    label: "Delivery Zones",
    permission: "delivery-zones.read",
    borderClass: "border-l-blue-500 border-r-blue-500",
    hoverClass: "hover:bg-blue-50 text-blue-950",
    activeClass: "bg-blue-600 text-white font-semibold border-l-blue-700 border-r-blue-700",
  },
  {
    href: "/dashboard/delivery-men",
    label: "Delivery Personnel",
    permission: "delivery-personnel.read",
    entitlement: "rider_management",
    borderClass: "border-l-blue-500 border-r-blue-500",
    hoverClass: "hover:bg-blue-50 text-blue-950",
    activeClass: "bg-blue-600 text-white font-semibold border-l-blue-700 border-r-blue-700",
  },
  {
    href: "/dashboard/delivery-map",
    label: "Live Delivery Map",
    permission: "delivery-personnel.read",
    entitlement: "live_rider_tracking",
    borderClass: "border-l-blue-500 border-r-blue-500",
    hoverClass: "hover:bg-blue-50 text-blue-950",
    activeClass: "bg-blue-600 text-white font-semibold border-l-blue-700 border-r-blue-700",
  },
  {
    href: "/dashboard/shipping",
    label: "Shipping",
    permission: "shipping.read",
    entitlement: "couriers_basic",
    borderClass: "border-l-blue-500 border-r-blue-500",
    hoverClass: "hover:bg-blue-50 text-blue-950",
    activeClass: "bg-blue-600 text-white font-semibold border-l-blue-700 border-r-blue-700",
  },

  // Messages & Engagement (Purple)
  {
    href: "/dashboard/messages",
    label: "Messages",
    permission: "messaging.read",
    borderClass: "border-l-purple-500 border-r-purple-500",
    hoverClass: "hover:bg-purple-50 text-purple-950",
    activeClass: "bg-purple-600 text-white font-semibold border-l-purple-700 border-r-purple-700",
  },
  {
    href: "/dashboard/abandoned-carts",
    label: "Abandoned Carts",
    permission: "messaging.read",
    borderClass: "border-l-purple-500 border-r-purple-500",
    hoverClass: "hover:bg-purple-50 text-purple-950",
    activeClass: "bg-purple-600 text-white font-semibold border-l-purple-700 border-r-purple-700",
  },
  {
    href: "/dashboard/chat",
    label: "Live Chat",
    permission: "chat.read",
    entitlement: "realtime_chat",
    borderClass: "border-l-purple-500 border-r-purple-500",
    hoverClass: "hover:bg-purple-50 text-purple-950",
    activeClass: "bg-purple-600 text-white font-semibold border-l-purple-700 border-r-purple-700",
  },

  // Operations & Audit (Rose / Red)
  {
    href: "/dashboard/purchase-activity",
    label: "Global order history",
    permission: "purchase-activity.read",
    entitlement: "purchase_social_proof",
    borderClass: "border-l-rose-500 border-r-rose-500",
    hoverClass: "hover:bg-rose-50 text-rose-950",
    activeClass: "bg-rose-600 text-white font-semibold border-l-rose-700 border-r-rose-700",
  },
  {
    href: "/dashboard/audit",
    label: "Audit",
    permission: "audit.read",
    borderClass: "border-l-rose-500 border-r-rose-500",
    hoverClass: "hover:bg-rose-50 text-rose-950",
    activeClass: "bg-rose-600 text-white font-semibold border-l-rose-700 border-r-rose-700",
  },
  {
    href: "/dashboard/staff",
    label: "Staff Access",
    ownerOnly: true,
    borderClass: "border-l-rose-500 border-r-rose-500",
    hoverClass: "hover:bg-rose-50 text-rose-950",
    activeClass: "bg-rose-600 text-white font-semibold border-l-rose-700 border-r-rose-700",
  },
  {
    href: "/dashboard/security",
    label: "Security",
    staffVisible: true,
    borderClass: "border-l-rose-500 border-r-rose-500",
    hoverClass: "hover:bg-rose-50 text-rose-950",
    activeClass: "bg-rose-600 text-white font-semibold border-l-rose-700 border-r-rose-700",
  },
  {
    href: "/dashboard/reconciliation",
    label: "Reconciliation",
    permission: "reconciliation.read",
    borderClass: "border-l-rose-500 border-r-rose-500",
    hoverClass: "hover:bg-rose-50 text-rose-950",
    activeClass: "bg-rose-600 text-white font-semibold border-l-rose-700 border-r-rose-700",
  },
  {
    href: "/dashboard/operations-health",
    label: "System Health",
    permission: "reconciliation.read",
    borderClass: "border-l-rose-500 border-r-rose-500",
    hoverClass: "hover:bg-rose-50 text-rose-950",
    activeClass: "bg-rose-600 text-white font-semibold border-l-rose-700 border-r-rose-700",
  },
  {
    href: "/dashboard/reports",
    label: "Reports",
    permission: "reports.read",
    entitlement: "basic_reports",
    borderClass: "border-l-rose-500 border-r-rose-500",
    hoverClass: "hover:bg-rose-50 text-rose-950",
    activeClass: "bg-rose-600 text-white font-semibold border-l-rose-700 border-r-rose-700",
  },
  {
    href: "/dashboard/analytics",
    label: "Analytics",
    permission: "reports.read",
    entitlement: "advanced_reports",
    borderClass: "border-l-rose-500 border-r-rose-500",
    hoverClass: "hover:bg-rose-50 text-rose-950",
    activeClass: "bg-rose-600 text-white font-semibold border-l-rose-700 border-r-rose-700",
  },
  {
    href: "/dashboard/charts",
    label: "Executive Charts & Graphs",
    permission: "reports.read",
    entitlement: "advanced_reports",
    borderClass: "border-l-rose-500 border-r-rose-500",
    hoverClass: "hover:bg-rose-50 text-rose-950",
    activeClass: "bg-rose-600 text-white font-semibold border-l-rose-700 border-r-rose-700",
  },

  // Settings & Content (Cyan / Teal)
  {
    href: "/dashboard/storefront-studio",
    label: "Storefront Studio",
    permission: "settings.read",
    borderClass: "border-l-cyan-500 border-r-cyan-500",
    hoverClass: "hover:bg-cyan-50 text-cyan-950",
    activeClass: "bg-cyan-600 text-white font-semibold border-l-cyan-700 border-r-cyan-700",
  },
  {
    href: "/dashboard/settings",
    label: "Settings",
    permission: "settings.read",
    borderClass: "border-l-cyan-500 border-r-cyan-500",
    hoverClass: "hover:bg-cyan-50 text-cyan-950",
    activeClass: "bg-cyan-600 text-white font-semibold border-l-cyan-700 border-r-cyan-700",
  },
  {
    href: "/dashboard/hero-showcase",
    label: "Hero Showcase",
    permission: "product-content.read",
    borderClass: "border-l-cyan-500 border-r-cyan-500",
    hoverClass: "hover:bg-cyan-50 text-cyan-950",
    activeClass: "bg-cyan-600 text-white font-semibold border-l-cyan-700 border-r-cyan-700",
  },
  {
    href: "/dashboard/feedback",
    label: "Suggestions & Feedback",
    permission: "product-content.read",
    borderClass: "border-l-cyan-500 border-r-cyan-500",
    hoverClass: "hover:bg-cyan-50 text-cyan-950",
    activeClass: "bg-cyan-600 text-white font-semibold border-l-cyan-700 border-r-cyan-700",
  },
];

export interface SidebarProps {
  isCollapsed?: boolean;
}

export default function Sidebar({ isCollapsed = false }: SidebarProps) {
  const pathname = usePathname();
  const [session, setSession] = useState<AdminSession | null>();
  const [features, setFeatures] = useState<Record<string, boolean> | null>(null);

  useEffect(() => {
    void Promise.all([
      fetch("/api/auth/session", { cache: "no-store" }),
      fetch("/api/admin/plan-status", { cache: "no-store" }),
    ])
      .then(async ([sessionResponse, planResponse]) => {
        const sessionPayload = (await sessionResponse.json()) as { data?: AdminSession };
        const planPayload = (await planResponse.json()) as {
          data?: { code?: string; features?: Record<string, boolean> };
        };
        setSession(sessionResponse.ok && sessionPayload.data ? sessionPayload.data : null);
        setFeatures(
          planResponse.ok && planPayload.data?.code === "ACTIVE"
            ? planPayload.data.features ?? {}
            : null,
        );
      })
      .catch(() => {
        setSession(null);
        setFeatures(null);
      });
  }, []);

  const visibleLinks = links.filter((link) => {
    if (session === undefined) return false;
    if (!session) return false;
    if (link.ownerOnly) return false;
    if (link.staffVisible) return true;
    const permissionAllowed = Boolean(
      session.role === "admin" ||
        (link.permission && session.permissions.includes(link.permission)),
    );
    const entitlementAllowed =
      features === null ||
      !link.entitlement ||
      features[link.entitlement] !== false;
    return permissionAllowed && entitlementAllowed;
  });

  return (
    <aside
      className={`sticky top-[52px] z-30 flex h-[calc(100vh-52px)] select-none flex-col border-r border-line bg-paper transition-all duration-200 ease-in-out overflow-hidden ${
        isCollapsed
          ? "w-0 border-r-0 opacity-0 pointer-events-none"
          : "w-56 shrink-0 opacity-100"
      }`}
    >
      <nav
        aria-label="Admin navigation"
        className="custom-scrollbar flex-1 overflow-y-auto space-y-0 py-1"
      >
        {visibleLinks.map((l) => {
          const active =
            l.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname === l.href || pathname.startsWith(`${l.href}/`);

          return (
            <Link
              key={l.href}
              href={l.href}
              aria-current={active ? "page" : undefined}
              className={`block px-3.5 py-2 text-[12.5px] border-l-[3.5px] border-r-[3.5px] transition-colors ${
                l.borderClass
              } ${active ? l.activeClass : `text-ink2 ${l.hoverClass}`}`}
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
