"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";

const links = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/orders", label: "Orders" },
  { href: "/dashboard/payments", label: "Payments" },
  { href: "/dashboard/returns", label: "Returns" },
  { href: "/dashboard/warranty", label: "Warranty" },
  { href: "/dashboard/products", label: "Products" },
  { href: "/dashboard/services", label: "Services" },
  { href: "/dashboard/inventory", label: "Inventory" },
  { href: "/dashboard/delivery", label: "Delivery" },
  { href: "/dashboard/shipping", label: "Shipping" },
  { href: "/dashboard/messages", label: "Messages" },
  { href: "/dashboard/chat", label: "Live Chat" },
  { href: "/dashboard/purchase-activity", label: "Global order history" },
  { href: "/dashboard/audit", label: "Audit" },
  { href: "/dashboard/reconciliation", label: "Reconciliation" },
  { href: "/dashboard/reports", label: "Reports" },
  { href: "/dashboard/settings", label: "Settings" },
  { href: "/dashboard/hero-showcase", label: "Hero Showcase" },
  { href: "/dashboard/customers", label: "Customers" },
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="flex h-screen w-56 flex-col border-r border-line bg-paper">
      <div className="px-6 py-7">
        <p className="text-[15px] font-semibold tracking-tight text-ink">
          Ferio
        </p>
      </div>
      <nav className="flex-1 space-y-0.5 px-3">
        {links.map((l) => {
          const active =
            l.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`block rounded-md px-3 py-2 text-[13px] transition ${
                active
                  ? "bg-surface text-ink font-medium"
                  : "text-ink2 hover:text-ink"
              }`}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-line px-6 py-5">
        <LogoutButton />
      </div>
    </aside>
  );
}
