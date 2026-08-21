"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Topbar from "@/components/Topbar";
import CopyableId from "@/components/CopyableId";
import { formatTaka } from "@/lib/catalog";
import type {
  CodPolicy,
  OrderFulfillmentStatus,
  OrderPage,
  OrderStatus,
} from "@/lib/orders";
import { orderStatusClass } from "@/lib/orders";

import Pagination from "@/components/Pagination";

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
  limit: 20,
  total: 0,
  totalPages: 0,
};

const fieldClass =
  "rounded-card border border-line bg-paper px-3.5 py-2 text-[13px] text-ink focus-visible:border-ink focus-visible:outline-none";

function formatEnum(value: string) {
  const label = value.replaceAll("_", " ").toLowerCase();
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function paymentMethodLabel(
  method: OrderPage["items"][number]["paymentMethod"],
) {
  if (method === "PAY_AT_STORE") return "Pay at store";
  if (method === "PREPAID") return "Prepaid";
  return "Cash on delivery";
}

export default function OrdersPage() {
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState<OrderPage>(emptyPage);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [status, setStatus] = useState<OrderStatus | "ALL">(() => {
    const value = searchParams.get("status") as OrderStatus | null;
    return value && statuses.includes(value) ? value : "ALL";
  });
  const [fulfillmentStatus, setFulfillmentStatus] = useState<
    OrderFulfillmentStatus | "ALL"
  >(() => {
    const value = searchParams.get(
      "fulfillmentStatus",
    ) as OrderFulfillmentStatus | null;
    return value && fulfillmentStatuses.includes(value) ? value : "ALL";
  });
  const [paymentStatus, setPaymentStatus] = useState(
    searchParams.get("paymentStatus") || "ALL",
  );
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
      const query = new URLSearchParams({
        page: String(page),
        limit: String(pageSize),
      });
      if (status !== "ALL") query.set("status", status);
      if (fulfillmentStatus !== "ALL")
        query.set("fulfillmentStatus", fulfillmentStatus);
      if (paymentStatus !== "ALL") query.set("paymentStatus", paymentStatus);
      if (dateFrom)
        query.set("dateFrom", new Date(`${dateFrom}T00:00:00`).toISOString());
      if (dateTo)
        query.set("dateTo", new Date(`${dateTo}T23:59:59.999`).toISOString());
      if (search) query.set("search", search);
      const response = await fetch(`/api/orders?${query.toString()}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        data?: OrderPage;
        message?: string;
      };
      if (!response.ok || !payload.data)
        throw new Error(payload.message || "Unable to load orders.");
      setOrders(payload.data);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load orders.",
      );
    } finally {
      setLoading(false);
    }
  }, [
    page,
    pageSize,
    dateFrom,
    dateTo,
    fulfillmentStatus,
    paymentStatus,
    search,
    status,
  ]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    async function loadPolicy() {
      try {
        const response = await fetch("/api/orders/cod-policy", {
          cache: "no-store",
        });
        const payload = (await response.json()) as {
          data?: CodPolicy;
          message?: string;
        };
        if (!response.ok || !payload.data)
          throw new Error(payload.message || "Unable to load COD policy.");
        setPolicy(payload.data);
      } catch (policyError) {
        setError(
          policyError instanceof Error
            ? policyError.message
            : "Unable to load COD policy.",
        );
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
          amountThreshold:
            policy.mode === "ABOVE_AMOUNT" ? policy.amountThreshold : null,
        }),
      });
      const payload = (await response.json()) as {
        data?: CodPolicy;
        message?: string;
      };
      if (!response.ok || !payload.data)
        throw new Error(payload.message || "Unable to update COD policy.");
      setPolicy(payload.data);
    } catch (policyError) {
      setError(
        policyError instanceof Error
          ? policyError.message
          : "Unable to update COD policy.",
      );
    } finally {
      setSavingPolicy(false);
    }
  }

  return (
    <>
      <Topbar
        title="Orders"
        subtitle={`${orders.total} order${orders.total === 1 ? "" : "s"}`}
      />
      <div className="space-y-8 p-8">
        {policy && (
          <form
            onSubmit={savePolicy}
            className="flex flex-wrap items-end gap-4 border-b border-line pb-7"
          >
            <label className="text-[12px] text-ink2">
              COD verification
              <select
                value={policy.mode}
                onChange={(event) =>
                  setPolicy({
                    ...policy,
                    mode: event.target.value as CodPolicy["mode"],
                  })
                }
                className={`mt-1.5 block ${fieldClass}`}
              >
                <option value="ALWAYS">Always verify</option>
                <option value="ABOVE_AMOUNT">Verify above amount</option>
                <option value="NEVER">Auto-confirm</option>
              </select>
            </label>
            {policy.mode === "ABOVE_AMOUNT" && (
              <label className="text-[12px] text-ink2">
                Amount threshold (৳)
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={(policy.amountThreshold ?? 0) / 100}
                  onChange={(event) =>
                    setPolicy({
                      ...policy,
                      amountThreshold: Math.round(
                        Number(event.target.value) * 100,
                      ),
                    })
                  }
                  className={`mt-1.5 block w-44 ${fieldClass}`}
                />
              </label>
            )}
            <button
              disabled={savingPolicy}
              className="rounded-full bg-ink px-5 py-2.5 text-[13px] text-white disabled:opacity-50"
            >
              {savingPolicy ? "Saving…" : "Save policy"}
            </button>
          </form>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            {statuses.map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={status === item}
                onClick={() => {
                  setStatus(item);
                  setPage(1);
                }}
                className={`rounded-full border px-3.5 py-1.5 text-[12px] transition ${status === item ? "border-ink bg-ink text-white" : "border-line text-ink2 hover:border-ink/40 hover:text-ink"}`}
              >
                {item === "ALL" ? "All" : formatEnum(item)}
              </button>
            ))}
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setSearch(searchInput.trim());
              setPage(1);
            }}
            className="flex flex-wrap gap-2"
          >
            <select
              value={fulfillmentStatus}
              onChange={(event) => {
                setFulfillmentStatus(
                  event.target.value as OrderFulfillmentStatus | "ALL",
                );
                setPage(1);
              }}
              aria-label="Fulfillment queue"
              className={fieldClass}
            >
              {fulfillmentStatuses.map((item) => (
                <option key={item} value={item}>
                  {item === "ALL" ? "All fulfillment" : formatEnum(item)}
                </option>
              ))}
            </select>
            <select
              value={paymentStatus}
              onChange={(event) => {
                setPaymentStatus(event.target.value);
                setPage(1);
              }}
              aria-label="Payment status"
              className={fieldClass}
            >
              <option value="ALL">All payments</option>
              <option value="UNPAID">Unpaid</option>
              <option value="PAID">Paid</option>
              <option value="FAILED">Failed</option>
              <option value="PARTIALLY_REFUNDED">Partially refunded</option>
              <option value="REFUNDED">Refunded</option>
            </select>
            <input
              value={dateFrom}
              onChange={(event) => {
                setDateFrom(event.target.value);
                setPage(1);
              }}
              type="date"
              aria-label="Orders from date"
              className={fieldClass}
            />
            <input
              value={dateTo}
              onChange={(event) => {
                setDateTo(event.target.value);
                setPage(1);
              }}
              type="date"
              min={dateFrom || undefined}
              aria-label="Orders to date"
              className={fieldClass}
            />
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              aria-label="Search orders"
              placeholder="Reference, customer, phone, courier or tracking"
              className={`w-72 ${fieldClass}`}
            />
            <button className="rounded-full bg-ink px-5 py-2 text-[13px] text-white">
              Search
            </button>
          </form>
        </div>

        {error && (
          <p role="alert" className="text-[13px] text-rose-700">
            {error}
          </p>
        )}
        <div
          className="overflow-x-auto border-y border-line"
          aria-busy={loading}
        >
          <table className="w-full min-w-[900px] border-collapse text-left">
            <thead>
              <tr className="border-b border-line text-[11px] uppercase tracking-eyebrow text-ink2">
                <th scope="col" className="w-24 px-4 py-3 font-normal">
                  ID
                </th>
                <th scope="col" className="px-5 py-3 font-normal">
                  Customer
                </th>
                <th scope="col" className="px-5 py-3 font-normal">
                  Destination
                </th>
                <th scope="col" className="px-5 py-3 font-normal">
                  Total
                </th>
                <th scope="col" className="px-5 py-3 font-normal">
                  Payment
                </th>
                <th scope="col" className="px-5 py-3 font-normal">
                  COD
                </th>
                <th scope="col" className="px-5 py-3 font-normal">
                  Fulfillment
                </th>
                <th scope="col" className="px-5 py-3 font-normal">
                  Courier
                </th>
                <th scope="col" className="px-5 py-3 font-normal">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {orders.items.map((order) => (
                <tr key={order.id} className="text-[13px] text-ink/80">
                  <td className="px-4 py-3.5 w-24">
                    <CopyableId
                      id={order.id}
                      displayValue={order.reference}
                      href={`/dashboard/orders/${order.id}`}
                    />
                    <p className="mt-0.5 text-[11px] text-ink2">
                      {new Date(order.createdAt).toLocaleString("en-BD")}
                    </p>
                  </td>
                  <td className="px-5 py-3.5">
                    <Link
                      href={`/dashboard/customers/${order.customer.id}`}
                      className="hover:underline"
                    >
                      {order.customer.name}
                    </Link>
                    <p className="text-[11px] text-ink2">
                      {order.customer.phoneNormalized}
                    </p>
                  </td>
                  <td className="px-5 py-3.5 text-ink2">
                    {order.address
                      ? `${order.address.area}, ${order.address.district}`
                      : "—"}
                  </td>
                  <td className="px-5 py-3.5 text-ink">
                    {formatTaka(order.total)}
                  </td>
                  <td className="px-5 py-3.5 text-ink2">
                    {paymentMethodLabel(order.paymentMethod)} ·{" "}
                    {formatEnum(order.paymentStatus)}
                  </td>
                  <td className="px-5 py-3.5 text-ink2">
                    {order.paymentMethod === "COD"
                      ? formatEnum(order.codVerification)
                      : "—"}
                  </td>
                  <td className="px-5 py-3.5 text-ink2">
                    {formatEnum(order.fulfillmentStatus)}
                  </td>
                  <td className="px-5 py-3.5 text-ink2">
                    {order.shipment ? (
                      <>
                        <p>{order.shipment.provider.name}</p>
                        <p className="text-[11px]">
                          {order.shipment.trackingNumber || "Tracking pending"}
                        </p>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] ${orderStatusClass[order.status]}`}
                    >
                      {formatEnum(order.status)}
                    </span>
                  </td>
                </tr>
              ))}
              {!loading && orders.items.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-5 py-14 text-center text-[13px] text-ink2"
                  >
                    No orders match this view.
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-5 py-14 text-center text-[13px] text-ink2"
                  >
                    Loading orders…
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <Pagination
            currentPage={page}
            totalPages={orders.totalPages}
            totalItems={orders.total}
            pageSize={pageSize}
            onPageChange={(newPage) => setPage(newPage)}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setPage(1);
            }}
            isLoading={loading}
          />
        </div>
      </div>
    </>
  );
}
