"use client";

import { useMemo, useState } from "react";
import type { OrderOperationalTimelineItem } from "@/lib/orders";

const timelineTypes = [
  "ORDER",
  "FULFILLMENT",
  "PAYMENT",
  "SHIPMENT",
  "RETURN",
  "REFUND",
  "MESSAGE",
] as const;

function statusClass(status: string) {
  if (
    [
      "SUCCEEDED",
      "DELIVERED",
      "SENT",
      "COMPLETED",
      "APPROVED",
      "FULFILLED",
      "PAID",
    ].includes(status)
  ) {
    return "bg-emerald-50 text-emerald-700";
  }
  if (["FAILED", "REJECTED", "CANCELLED", "EXPIRED"].includes(status)) {
    return "bg-rose-50 text-rose-700";
  }
  if (["BLOCKED", "UNKNOWN", "REQUIRES_ACTION"].includes(status)) {
    return "bg-amber-50 text-amber-700";
  }
  return "bg-surface text-ink2";
}

export default function OrderOperationalTimeline({
  items,
}: {
  items: OrderOperationalTimelineItem[];
}) {
  const [type, setType] = useState<
    OrderOperationalTimelineItem["type"] | "ALL"
  >("ALL");
  const filtered = useMemo(
    () => (type === "ALL" ? items : items.filter((item) => item.type === type)),
    [items, type],
  );
  const availableTypes = timelineTypes.filter((candidate) =>
    items.some((item) => item.type === candidate),
  );

  return (
    <section className="rounded-card border border-line p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-[16px] font-medium text-ink">
            Operational timeline
          </h2>
          <p className="mt-1 text-[12px] text-ink2">
            Payment, warehouse, courier, return, refund, and message evidence in
            one investigation path.
          </p>
        </div>
        <span className="text-[12px] text-ink2">
          {filtered.length} event{filtered.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          aria-pressed={type === "ALL"}
          onClick={() => setType("ALL")}
          className={`rounded-full border px-3 py-1.5 text-[11px] transition ${type === "ALL" ? "border-ink bg-ink text-white" : "border-line text-ink2 hover:border-ink/40"}`}
        >
          All
        </button>
        {availableTypes.map((candidate) => (
          <button
            key={candidate}
            type="button"
            aria-pressed={type === candidate}
            onClick={() => setType(candidate)}
            className={`rounded-full border px-3 py-1.5 text-[11px] transition ${type === candidate ? "border-ink bg-ink text-white" : "border-line text-ink2 hover:border-ink/40"}`}
          >
            {candidate.toLowerCase()}
          </button>
        ))}
      </div>

      <div className="mt-5 divide-y divide-line border-y border-line">
        {filtered.map((item) => (
          <article
            key={item.id}
            className="grid gap-2 py-4 text-[12px] md:grid-cols-[110px_1fr_160px]"
          >
            <div>
              <span className="text-[11px] uppercase tracking-eyebrow text-ink2">
                {item.type.toLowerCase()}
              </span>
              <span
                className={`mt-2 block w-fit rounded-full px-2.5 py-1 text-[10px] ${statusClass(item.status)}`}
              >
                {item.status.replaceAll("_", " ").toLowerCase()}
              </span>
            </div>
            <div>
              <p className="text-[13px] font-medium text-ink">{item.title}</p>
              {item.detail && (
                <p className="mt-1 break-words leading-5 text-ink2">
                  {item.detail}
                </p>
              )}
            </div>
            <time className="text-ink2 md:text-right">
              {new Date(item.occurredAt).toLocaleString("en-BD")}
            </time>
          </article>
        ))}
        {filtered.length === 0 && (
          <p className="py-10 text-center text-[12px] text-ink2">
            No evidence exists for this lifecycle area.
          </p>
        )}
      </div>
    </section>
  );
}
