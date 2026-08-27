"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { PurchaseActivityPage } from "@/lib/purchase-activity";
import { relativePurchaseTime } from "@/lib/purchase-activity";

export default function PurchaseActivityToast() {
  const [activity, setActivity] = useState<PurchaseActivityPage | null>(null);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    fetch("/api/purchase-activity?surface=toast&limit=10", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { data?: PurchaseActivityPage } | null) => {
        if (payload?.data?.items.length) setActivity(payload.data);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!activity?.items.length || !activity.settings.activityEnabled) return;
    setVisible(true);
    const hideTimer = window.setTimeout(
      () => setVisible(false),
      activity.settings.displayDurationMs,
    );
    const nextTimer = window.setTimeout(() => {
      setIndex((current) => (current + 1) % activity.items.length);
    }, activity.settings.intervalSeconds * 1000);
    return () => {
      window.clearTimeout(hideTimer);
      window.clearTimeout(nextTimer);
    };
  }, [activity, index]);

  const item = activity?.items[index];
  if (!item || !visible) return null;

  return (
    <aside
      aria-live="polite"
      className="fixed bottom-5 left-4 z-50 w-[calc(100%-2rem)] max-w-sm border border-line bg-paper p-4 md:bottom-8 md:left-8"
    >
      <div className="flex gap-3">
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-card bg-surface">
          {item.imageUrl ? (
            <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] uppercase tracking-eyebrow text-ink2">
            Verified purchase
          </p>
          <p className="mt-1 text-[13px] leading-5 text-ink">
            {item.customerName} ordered {item.productName}
            {item.additionalItemCount > 0
              ? ` +${item.additionalItemCount} ${item.additionalItemCount === 1 ? "item" : "items"}`
              : ""}
            {item.location ? ` from ${item.location}` : ""}
          </p>
          <p className="mt-1 text-[11px] text-ink2">
            {relativePurchaseTime(item.purchasedAt)}
          </p>
        </div>
        {activity.settings.historyEnabled ? (
          <Link href="/purchase-history" className="text-[11px] text-ink2 underline underline-offset-4">
            View
          </Link>
        ) : null}
      </div>
    </aside>
  );
}
