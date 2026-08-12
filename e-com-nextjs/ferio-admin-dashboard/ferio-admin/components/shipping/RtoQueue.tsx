"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { formatTaka } from "@/lib/catalog";
import type { RtoCase } from "@/lib/shipping";

function ReceiptForm({
  entry,
  reload,
}: {
  entry: RtoCase;
  reload: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setError("");
    try {
      const items = entry.items.map((item) => ({
        rtoItemId: item.id,
        receivedQuantity: Number(form.get(`received-${item.id}`)),
        sellableQuantity: Number(form.get(`sellable-${item.id}`)),
        damagedQuantity: Number(form.get(`damaged-${item.id}`)),
        lostQuantity: Number(form.get(`lost-${item.id}`)),
        note: String(form.get(`note-${item.id}`) || "") || undefined,
      }));
      const response = await fetch(`/api/rto/${entry.id}/inspect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: form.get("reason"),
          reasonNote: form.get("reasonNote"),
          outboundCourierCost: Math.round(
            Number(form.get("outboundCourierCost")) * 100,
          ),
          returnCourierCost: Math.round(
            Number(form.get("returnCourierCost")) * 100,
          ),
          otherCost: Math.round(Number(form.get("otherCost")) * 100),
          items,
        }),
      });
      const payload = (await response.json()) as {
        data?: RtoCase;
        message?: string;
      };
      if (!response.ok || !payload.data)
        throw new Error(payload.message || "Unable to inspect RTO parcel.");
      reload();
    } catch (inspectionError) {
      setError(
        inspectionError instanceof Error
          ? inspectionError.message
          : "Unable to inspect RTO parcel.",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <form onSubmit={submit} className="mt-4 border-t border-line pt-4">
      <p className="text-[11px] leading-5 text-ink2">
        Count every expected unit. Received must equal sellable plus damaged;
        expected must equal received plus lost.
      </p>
      <div className="mt-3 space-y-3">
        {entry.items.map((item) => (
          <div
            key={item.id}
            className="grid gap-2 rounded-card border border-line p-3 md:grid-cols-2 xl:grid-cols-5"
          >
            <p className="text-[12px] text-ink xl:col-span-1">
              {item.orderItem.productName}
              <span className="block text-[10px] text-ink2">
                {item.orderItem.variantName} · expected {item.expectedQuantity}
              </span>
            </p>
            {(["received", "sellable", "damaged", "lost"] as const).map(
              (field) => (
                <label key={field} className="text-[10px] capitalize text-ink2">
                  {field}
                  <input
                    required
                    name={`${field}-${item.id}`}
                    type="number"
                    min="0"
                    max={item.expectedQuantity}
                    defaultValue={
                      field === "received" || field === "sellable"
                        ? item.expectedQuantity
                        : 0
                    }
                    className="mt-1 w-full rounded-card border border-line px-2.5 py-2 text-[11px]"
                  />
                </label>
              ),
            )}
            <input
              name={`note-${item.id}`}
              maxLength={500}
              placeholder="Optional item note"
              className="rounded-card border border-line px-3 py-2 text-[11px] md:col-span-2 xl:col-span-5"
            />
          </div>
        ))}
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-5">
        <select
          name="reason"
          className="rounded-card border border-line px-3 py-2 text-[11px]"
        >
          <option value="CUSTOMER_UNREACHABLE">Customer unreachable</option>
          <option value="CUSTOMER_REFUSED">Customer refused</option>
          <option value="ADDRESS_ISSUE">Address issue</option>
          <option value="DELIVERY_ATTEMPTS_EXHAUSTED">
            Attempts exhausted
          </option>
          <option value="COURIER_ISSUE">Courier issue</option>
          <option value="DAMAGED_IN_TRANSIT">Damaged in transit</option>
          <option value="OTHER">Other</option>
        </select>
        <input
          required
          name="reasonNote"
          minLength={3}
          maxLength={1000}
          placeholder="Required operational reason"
          className="rounded-card border border-line px-3 py-2 text-[11px]"
        />
        <label className="text-[10px] text-ink2">
          Outbound cost
          <input
            required
            name="outboundCourierCost"
            type="number"
            min="0"
            step="0.01"
            defaultValue={(entry.outboundCourierCost / 100).toFixed(2)}
            className="mt-1 w-full rounded-card border border-line px-3 py-2 text-[11px]"
          />
        </label>
        <label className="text-[10px] text-ink2">
          Return cost
          <input
            required
            name="returnCourierCost"
            type="number"
            min="0"
            step="0.01"
            defaultValue="0.00"
            className="mt-1 w-full rounded-card border border-line px-3 py-2 text-[11px]"
          />
        </label>
        <label className="text-[10px] text-ink2">
          Other cost
          <input
            required
            name="otherCost"
            type="number"
            min="0"
            step="0.01"
            defaultValue="0.00"
            className="mt-1 w-full rounded-card border border-line px-3 py-2 text-[11px]"
          />
        </label>
      </div>
      <button
        disabled={saving}
        className="mt-3 rounded-full bg-ink px-4 py-2 text-[11px] text-white disabled:opacity-40"
      >
        {saving ? "Recording…" : "Receive and inspect RTO"}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-[11px] text-rose-700">
          {error}
        </p>
      )}
    </form>
  );
}

export default function RtoQueue() {
  const [cases, setCases] = useState<RtoCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/rto", { cache: "no-store" });
      const payload = (await response.json()) as {
        data?: RtoCase[];
        message?: string;
      };
      if (!response.ok || !payload.data)
        throw new Error(payload.message || "Unable to load RTO cases.");
      setCases(payload.data);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load RTO cases.",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[16px] font-medium text-ink">
            RTO receipt queue
          </h2>
          <p className="mt-1 max-w-3xl text-[12px] leading-5 text-ink2">
            Courier return events open cases but stock stays reserved until
            physical receipt and disposition are recorded.
          </p>
        </div>
        <span className="text-[11px] uppercase tracking-eyebrow text-ink2">
          {cases.filter((entry) => entry.status === "AWAITING_RECEIPT").length}{" "}
          awaiting receipt
        </span>
      </div>
      {error && (
        <p role="alert" className="mt-4 text-[12px] text-rose-700">
          {error}
        </p>
      )}
      <div className="mt-5 divide-y divide-line border-y border-line">
        {cases.map((entry) => (
          <article key={entry.id} className="py-5">
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <Link
                  href={`/dashboard/orders/${entry.order.id}`}
                  className="text-[13px] font-medium text-ink hover:underline"
                >
                  {entry.reference} · {entry.order.reference}
                </Link>
                <p className="mt-1 text-[11px] text-ink2">
                  {entry.order.customer.name} · {entry.shipment.provider.name} ·{" "}
                  {entry.courierReason || "courier return"}
                </p>
              </div>
              <div className="text-right">
                <span
                  className={`rounded-full px-2.5 py-1 text-[10px] ${entry.status === "INSPECTED" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}
                >
                  {entry.status.replaceAll("_", " ").toLowerCase()}
                </span>
                {entry.status === "INSPECTED" && (
                  <p className="mt-2 text-[11px] text-ink2">
                    Cost {formatTaka(entry.totalCost)}
                  </p>
                )}
              </div>
            </div>
            {entry.status === "AWAITING_RECEIPT" ? (
              <ReceiptForm entry={entry} reload={() => void load()} />
            ) : (
              <div className="mt-3 text-[11px] text-ink2">
                <p>
                  {entry.reason?.replaceAll("_", " ").toLowerCase()} ·{" "}
                  {entry.reasonNote}
                </p>
                {entry.items.map((item) => (
                  <p key={item.id}>
                    {item.orderItem.productName}: sellable{" "}
                    {item.sellableQuantity}, damaged {item.damagedQuantity},
                    lost {item.lostQuantity}
                  </p>
                ))}
              </div>
            )}
          </article>
        ))}
        {loading && (
          <p className="py-12 text-center text-[12px] text-ink2">
            Loading RTO cases…
          </p>
        )}
        {!loading && cases.length === 0 && (
          <p className="py-12 text-center text-[12px] text-ink2">
            No RTO cases recorded.
          </p>
        )}
      </div>
    </section>
  );
}
