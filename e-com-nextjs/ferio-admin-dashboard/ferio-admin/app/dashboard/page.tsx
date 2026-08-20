"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import StatCard from "@/components/StatCard";
import Topbar from "@/components/Topbar";
import LivePageVisitorsCard from "@/components/LivePageVisitorsCard";
import CopyableId from "@/components/CopyableId";
import { formatTaka } from "@/lib/catalog";
import type { OrderPage } from "@/lib/orders";
import { orderStatusClass } from "@/lib/orders";
import type { ReportsOverview } from "@/lib/reports";

export default function DashboardPage() {
  const [report, setReport] = useState<ReportsOverview | null>(null);
  const [orders, setOrders] = useState<OrderPage["items"]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [reportResponse, ordersResponse] = await Promise.all([
          fetch("/api/reports/overview", { cache: "no-store" }),
          fetch("/api/orders?limit=5", { cache: "no-store" }),
        ]);
        const reportPayload = (await reportResponse.json()) as {
          data?: ReportsOverview;
          message?: string;
        };
        const ordersPayload = (await ordersResponse.json()) as {
          data?: OrderPage;
          message?: string;
        };
        if (!reportResponse.ok || !reportPayload.data) {
          throw new Error(reportPayload.message || "Unable to load overview.");
        }
        if (!ordersResponse.ok || !ordersPayload.data) {
          throw new Error(ordersPayload.message || "Unable to load recent orders.");
        }
        setReport(reportPayload.data);
        setOrders(ordersPayload.data.items);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load overview.",
        );
      }
    }
    void load();
  }, []);

  return (
    <>
      <Topbar
        title="Overview"
        subtitle={
          report
            ? `${report.basis.dateFrom} — ${report.basis.dateTo} order-created cohort`
            : "Live operational summary"
        }
      />
      <main className="p-8 space-y-8">
        {error && (
          <p role="alert" className="text-[12px] text-rose-700">
            {error}
          </p>
        )}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
          <StatCard
            label="Gross delivered"
            value={report ? formatTaka(report.revenue.grossDelivered) : "—"}
            hint="Order-created cohort"
          />
          <StatCard
            label="Placed orders"
            value={report ? String(report.outcomes.placed) : "—"}
          />
          <StatCard
            label="Needs confirmation"
            value={report ? String(report.operations.pendingConfirmation) : "—"}
            hint="Operational queue"
          />
          <StatCard
            label="Delivered"
            value={report ? String(report.outcomes.delivered) : "—"}
          />
          <StatCard
            label="RTO"
            value={report ? String(report.outcomes.rto) : "—"}
          />
          <StatCard
            label="Contribution"
            value="Unavailable"
            hint="Required cost inputs missing"
          />
        </div>

        {/* 2-Column Main Section: Left = Recent Orders, Right = Real-time Page Visitors */}
        <div className="grid grid-cols-1 gap-8 xl:grid-cols-3">
          <section className="xl:col-span-2 rounded-card border border-line bg-white shadow-xs">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <div>
                <h2 className="text-[13px] font-medium text-ink">Recent orders</h2>
                <p className="mt-0.5 text-[11px] text-ink2">Live backend data</p>
              </div>
              <div className="flex gap-4 text-[12px] text-ink2">
                <Link href="/dashboard/reports" className="hover:text-ink">Reports</Link>
                <Link href="/dashboard/orders" className="hover:text-ink">View all</Link>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-left">
                <thead>
                  <tr className="text-[11px] uppercase tracking-eyebrow text-ink2">
                    <th className="px-4 py-3 font-normal w-24">Id</th>
                    <th className="px-5 py-3 font-normal">Customer</th>
                    <th className="px-5 py-3 font-normal">Area</th>
                    <th className="px-5 py-3 font-normal">Total</th>
                    <th className="px-5 py-3 font-normal">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {orders.map((order) => (
                    <tr key={order.id} className="text-[13px] text-ink/80">
                      <td className="px-4 py-3.5 w-24">
                        <CopyableId
                          id={order.id}
                          displayValue={order.reference}
                          href={`/dashboard/orders/${order.id}`}
                        />
                      </td>
                      <td className="px-5 py-3.5">{order.customer.name}</td>
                      <td className="px-5 py-3.5 text-ink2">{order.address ? `${order.address.area}, ${order.address.district}` : "—"}</td>
                      <td className="px-5 py-3.5">{formatTaka(order.total)}</td>
                      <td className="px-5 py-3.5">
                        <span className={`rounded-full px-2.5 py-1 text-[11px] ${orderStatusClass[order.status]}`}>
                          {order.status.replaceAll("_", " ")}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {!error && orders.length === 0 && (
                    <tr><td colSpan={5} className="px-5 py-14 text-center text-[13px] text-ink2">No orders yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Right Column: Real-Time Page Visitors Analytics Card */}
          <div className="xl:col-span-1">
            <LivePageVisitorsCard />
          </div>
        </div>
      </main>
    </>
  );
}
