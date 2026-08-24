"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface SetupItem {
  key: string;
  label: string;
  done: boolean;
  href: string;
}

/**
 * Store Setup checklist (MT-10 §13.1, consolidated): surfaces onboarding
 * completion state from existing configuration endpoints with deep links.
 * One sentence + one action per item — design-language compliant.
 */
export default function StoreSetupChecklist() {
  const [items, setItems] = useState<SetupItem[] | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/commerce-settings").then((r) => r.json()).catch(() => null),
      fetch("/api/admin/delivery-zones").then((r) => r.json()).catch(() => null),
      fetch("/api/payments/providers").then((r) => r.json()).catch(() => null),
    ]).then(([settingsRes, zonesRes, providersRes]) => {
      const settings = settingsRes?.data ?? settingsRes ?? {};
      const zones = zonesRes?.data?.items ?? zonesRes?.items ?? [];
      const providers = Array.isArray(providersRes?.data)
        ? providersRes.data
        : (providersRes?.data?.providers ?? providersRes?.providers ?? []);

      const storeNamed = Boolean(settings.storeName && settings.storeName !== "Ferio" && settings.storeName !== "My Store");
      const supportSet = Boolean(settings.supportPhone || settings.supportEmail);
      const hasZones = Array.isArray(zones) && zones.length > 0;
      const paymentConfigured = settings.codEnabled === true ||
        providers.some?.((p: { configured?: boolean }) => p.configured) === true;
      const codPolicyChosen = settings.codEnabled !== undefined;

      setItems([
        { key: "identity", label: "Store name and identity", done: storeNamed, href: "/dashboard/settings" },
        { key: "support", label: "Support contact for customers", done: supportSet, href: "/dashboard/settings" },
        { key: "zones", label: "Delivery zones and fees", done: hasZones, href: "/dashboard/delivery" },
        { key: "payments", label: "A payment method enabled (COD counts)", done: paymentConfigured, href: "/dashboard/payments" },
        { key: "cod", label: "Cash-on-delivery policy chosen", done: codPolicyChosen, href: "/dashboard/settings" },
      ]);
    });
  }, []);

  if (!items) return null;
  const remaining = items.filter((i) => !i.done);
  if (remaining.length === 0) return null;

  return (
    <div className="rounded-card border border-line bg-paper p-5">
      <p className="text-[11px] uppercase tracking-eyebrow text-ink2">Store Setup</p>
      <p className="mt-1 text-[14px]">
        {remaining.length === items.length
          ? "Finish setup to start selling."
          : `Almost there — ${remaining.length} step${remaining.length > 1 ? "s" : ""} left.`}
      </p>
      <ul className="mt-3 space-y-2 text-[13px]">
        {items.map((item) => (
          <li key={item.key} className="flex justify-between gap-4">
            <span className={item.done ? "text-ink2 line-through" : ""}>{item.label}</span>
            {item.done ? (
              <span className="statuspill">Done</span>
            ) : (
              <Link href={item.href} className="underline whitespace-nowrap">
                Set up
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
