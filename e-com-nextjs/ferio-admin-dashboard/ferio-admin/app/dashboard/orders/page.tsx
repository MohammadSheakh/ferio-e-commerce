"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Topbar from "@/components/Topbar";
import { formatTaka } from "@/lib/catalog";
import type { CodPolicy, OrderFulfillmentStatus, OrderPage, OrderStatus } from "@/lib/orders";
import { orderStatusClass } from "@/lib/orders";

const statuses: Array<OrderStatus | "ALL"> = [
  "ALL",
  "PENDING_CONFIRMATION",
  "CONFIRMED",
  "CANCELLED",
  "DELIVERED",
  "COMPLETED",
];

const fulfillmentStatuses: Array<OrderFulfillmentStatus | "ALL"> = [
  "ALL",
  "READY_FOR_FULFILLMENT",
  "PICKING",
  "PACKED",
  "QUALITY_CHECKED",
  "READY_FOR_HANDOVER",
  "HANDED_OVER",
];

const emptyPage: OrderPage = {
  items: [],
  page: 1,
  limit: 30,
  total: 0,
  totalPages: 0,
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderPage>(emptyPage);
  const [status, setStatus] = useState<OrderStatus | "ALL">("ALL");
  const [fulfillmentStatus, setFulfillmentStatus] = useState<OrderFulfillmentStatus | "ALL">("ALL");
  const [paymentStatus, setPaymentStatus] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [policy, setPolicy] = useState<CodPolicy | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [error, setError] = useState("");

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams();
      if (status !== "ALL") query.set("status", status);
      if (fulfillmentStatus !== "ALL") query.set("fulfillmentStatus", fulfillmentStatus);
      if (paymentStatus !== "ALL") query.set("paymentStatus", paymentStatus);
      if (dateFrom) query.set("dateFrom", new Date(`${dateFrom}T00:00:00`).toISOString());
      if (dateTo) query.set("dateTo", new Date(`${dateTo}T23:59:59.999`).toISOString());
      if (search) query.set("search", search);
      const response = await fetch(`/api/orders?${query.toString()}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as { data?: OrderPage; message?: string };
      if (!response.ok || !payload.data) throw new Error(payload.message || "Unable to load orders.");
      setOrders(payload.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load orders.");
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, fulfillmentStatus, paymentStatus, search, status]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    async function loadPolicy() {
      try {
        const response = await fetch("/api/orders/cod-policy", { cache: "no-store" });
        const payload = (await response.json()) as { data?: CodPolicy; message?: string };
        if (!response.ok || !payload.data) throw new Error(payload.message || "Unable to load COD policy.");
        setPolicy(payload.data);
      } catch (policyError) {
        setError(policyError instanceof Error ? policyError.message : "Unable to load COD policy.");
      }
    }
    void loadPolicy();
  }, []);

  async function savePolicy(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!policy) return;
    setSavingPolicy(true);
    setError("");
    try {
      const response = await fetch("/api/orders/cod-policy", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: policy.mode,
          amountThreshold: policy.mode === "ABOVE_AMOUNT" ? policy.amountThreshold : null,
        }),
      });
      const payload = (await response.json()) as { data?: CodPolicy; message?: string };
      if (!response.ok || !payload.data) throw new Error(payload.message || "Unable to update COD policy.");
      setPolicy(payload.data);
    } catch (policyError) {
      setError(policyError instanceof Error ? policyError.message : "Unable to update COD policy.");
    } finally {
      setSavingPolicy(false);
    }
  }

  return (
    <>
      <Topbar title="Orders" subtitle={`${orders.total} orders`} />
      <div className="space-y-8 p-8">
        {policy && (
          <form onSubmit={savePolicy} className="flex flex-wrap items-end gap-4 border-b border-line pb-7">
            <label className="text-[12px] text-ink2">
              COD verification
              <select value={policy.mode} onChange={(event) => setPolicy({ ...policy, mode: event.target.value as CodPolicy["mode"] })} className="mt-1.5 block rounded-card border border-line px-3.5 py-2 text-[13px] outline-none focus:border-ink">
                <option value="ALWAYS">Always verify</option>
                <option value="ABOVE_AMOUNT">Verify above amount</option>
                <option value="NEVER">Auto-confirm</option>
              </select>
            </label>
            {policy.mode === "ABOVE_AMOUNT" && (
              <label className="text-[12px] text-ink2">
                Amount threshold (৳)
                <input required type="number" min="0" step="0.01" value={(policy.amountThreshold ?? 0) / 100} onChange={(event) => setPolicy({ ...policy, amountThreshold: Math.round(Number(event.target.value) * 100) })} className="mt-1.5 block w-44 rounded-card border border-line px-3.5 py-2 text-[13px] outline-none focus:border-ink" />
              </label>
            )}
            <button disabled={savingPolicy} className="rounded-full bg-ink px-5 py-2.5 text-[13px] text-white disabled:opacity-50">{savingPolicy ? "Saving…" : "Save policy"}</button>
          </form>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            {statuses.map((item) => (
              <button key={item} onClick={() => setStatus(item)} className={`rounded-full px-3.5 py-1.5 text-[12px] transition ${status === item ? "bg-ink text-white" : "text-ink2 ring-1 ring-line hover:text-ink"}`}>
                {item === "ALL" ? "All" : item.replaceAll("_", " ").toLowerCase()}
              </button>
            ))}
          </div>
          <form onSubmit={(event) => { event.preventDefault(); setSearch(searchInput.trim()); }} className="flex flex-wrap gap-2">
            <select value={fulfillmentStatus} onChange={(event) => setFulfillmentStatus(event.target.value as OrderFulfillmentStatus | "ALL")} aria-label="Fulfillment queue" className="rounded-full border border-line px-4 py-2 text-[13px] text-ink2 outline-none focus:border-ink">
              {fulfillmentStatuses.map((item) => <option key={item} value={item}>{item === "ALL" ? "All fulfillment" : item.replaceAll("_", " ").toLowerCase()}</option>)}
            </select>
            <select value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value)} aria-label="Payment status" className="rounded-full border border-line px-4 py-2 text-[13px] text-ink2 outline-none focus:border-ink"><option value="ALL">All payments</option><option value="UNPAID">Unpaid</option><option value="PAID">Paid</option><option value="FAILED">Failed</option><option value="PARTIALLY_REFUNDED">Partially refunded</option><option value="REFUNDED">Refunded</option></select>
            <input value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} type="date" aria-label="Orders from date" className="rounded-full border border-line px-4 py-2 text-[13px] text-ink2 outline-none focus:border-ink" />
            <input value={dateTo} onChange={(event) => setDateTo(event.target.value)} type="date" min={dateFrom || undefined} aria-label="Orders to date" className="rounded-full border border-line px-4 py-2 text-[13px] text-ink2 outline-none focus:border-ink" />
            <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Reference, customer, phone, courier or tracking" className="w-72 rounded-full border border-line px-4 py-2 text-[13px] outline-none focus:border-ink" />
            <button className="rounded-full bg-ink px-5 py-2 text-[13px] text-white">Search</button>
          </form>
        </div>

        {error && <p role="alert" className="text-[13px] text-rose-700">{error}</p>}
        <div className="overflow-x-auto rounded-card border border-line">
          <table className="w-full min-w-[900px] text-left">
            <thead><tr className="text-[11px] uppercase tracking-eyebrow text-ink2"><th className="px-5 py-3 font-normal">Order</th><th className="px-5 py-3 font-normal">Customer</th><th className="px-5 py-3 font-normal">Destination</th><th className="px-5 py-3 font-normal">Total</th><th className="px-5 py-3 font-normal">Payment</th><th className="px-5 py-3 font-normal">COD</th><th className="px-5 py-3 font-normal">Fulfillment</th><th className="px-5 py-3 font-normal">Courier</th><th className="px-5 py-3 font-normal">Status</th></tr></thead>
            <tbody className="divide-y divide-line">
              {orders.items.map((order) => (
                <tr key={order.id} className="text-[13px] text-ink/80">
                  <td className="px-5 py-3.5"><Link href={`/dashboard/orders/${order.id}`} className="font-medium text-ink hover:underline">{order.reference}</Link><p className="mt-0.5 text-[11px] text-ink2">{new Date(order.createdAt).toLocaleString("en-BD")}</p></td>
                  <td className="px-5 py-3.5"><p>{order.customer.name}</p><p className="text-[11px] text-ink2">{order.customer.phoneNormalized}</p></td>
                  <td className="px-5 py-3.5 text-ink2">{order.address ? `${order.address.area}, ${order.address.district}` : "—"}</td>
                  <td className="px-5 py-3.5 text-ink">{formatTaka(order.total)}</td>
                  <td className="px-5 py-3.5 text-ink2">COD · {order.paymentStatus.toLowerCase()}</td>
                  <td className="px-5 py-3.5 text-ink2">{order.codVerification.replaceAll("_", " ").toLowerCase()}</td>
                  <td className="px-5 py-3.5 text-ink2">{order.fulfillmentStatus.replaceAll("_", " ").toLowerCase()}</td>
                  <td className="px-5 py-3.5 text-ink2">{order.shipment ? <><p>{order.shipment.provider.name}</p><p className="text-[11px]">{order.shipment.trackingNumber || "Tracking pending"}</p></> : "—"}</td>
                  <td className="px-5 py-3.5"><span className={`rounded-full px-2.5 py-1 text-[11px] ${orderStatusClass[order.status]}`}>{order.status.replaceAll("_", " ").toLowerCase()}</span></td>
                </tr>
              ))}
              {!loading && orders.items.length === 0 && <tr><td colSpan={9} className="px-5 py-14 text-center text-[13px] text-ink2">No orders match this view.</td></tr>}
              {loading && <tr><td colSpan={9} className="px-5 py-14 text-center text-[13px] text-ink2">Loading orders…</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
