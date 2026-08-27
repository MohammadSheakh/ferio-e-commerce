"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import CopyableId from "@/components/CopyableId";
import LivePageVisitorsCard from "@/components/LivePageVisitorsCard";
import OperationalAlerts from "@/components/operations/OperationalAlerts";
import StatCard from "@/components/StatCard";
import Topbar from "@/components/Topbar";
import type { AdminSession } from "@/lib/admin-session";
import { sessionCan } from "@/lib/admin-session";
import { formatTaka } from "@/lib/catalog";
import type { OperationalAlertResponse } from "@/lib/operational-alerts";
import type { OrderPage } from "@/lib/orders";
import { orderStatusClass } from "@/lib/orders";
import type { ReportsOverview } from "@/lib/reports";

type OperationsCounts = {
  pendingConfirmation: number;
  readyForFulfillment: number;
  readyForHandover: number;
};

async function orderCount(query: string): Promise<number> {
  const response = await fetch(`/api/orders?limit=1&${query}`, {
    cache: "no-store",
  });
  const payload = (await response.json()) as {
    data?: OrderPage;
    message?: string;
  };
  if (!response.ok || !payload.data) {
    throw new Error(payload.message || "Unable to load order queue counts.");
  }
  return payload.data.total;
}

export default function DashboardPage() {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [report, setReport] = useState<ReportsOverview | null>(null);
  const [orders, setOrders] = useState<OrderPage["items"]>([]);
  const [operations, setOperations] = useState<OperationsCounts | null>(null);
  const [alerts, setAlerts] = useState<OperationalAlertResponse | null>(null);
  const [alertsUnavailable, setAlertsUnavailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const sessionResponse = await fetch("/api/auth/session", {
          cache: "no-store",
        });
        const sessionPayload = (await sessionResponse.json()) as {
          data?: AdminSession;
          message?: string;
        };
        if (!sessionResponse.ok || !sessionPayload.data) {
          throw new Error(
            sessionPayload.message || "Unable to load your workspace access.",
          );
        }
        const currentSession = sessionPayload.data;
        setSession(currentSession);
        const tasks: Promise<void>[] = [];

        if (sessionCan(currentSession, "reports.read")) {
          tasks.push(
            fetch("/api/reports/overview", { cache: "no-store" }).then(
              async (response) => {
                const payload = (await response.json()) as {
                  data?: ReportsOverview;
                  message?: string;
                };
                if (!response.ok || !payload.data) {
                  throw new Error(payload.message || "Unable to load reports.");
                }
                setReport(payload.data);
              },
            ),
          );
        }
        if (sessionCan(currentSession, "orders.read")) {
          tasks.push(
            Promise.all([
              fetch("/api/orders?limit=5", { cache: "no-store" }),
              orderCount("status=PENDING_CONFIRMATION"),
              orderCount("fulfillmentStatus=READY_FOR_FULFILLMENT"),
              orderCount("fulfillmentStatus=READY_FOR_HANDOVER"),
            ]).then(async ([response, pending, ready, handover]) => {
              const payload = (await response.json()) as {
                data?: OrderPage;
                message?: string;
              };
              if (!response.ok || !payload.data) {
                throw new Error(
                  payload.message || "Unable to load recent orders.",
                );
              }
              setOrders(payload.data.items);
              setOperations({
                pendingConfirmation: pending,
                readyForFulfillment: ready,
                readyForHandover: handover,
              });
            }),
          );
        }
        if (sessionCan(currentSession, "reconciliation.read")) {
          tasks.push(
            fetch("/api/reconciliation/alerts", { cache: "no-store" }).then(
              async (response) => {
                if (!response.ok) {
                  setAlertsUnavailable(true);
                  return;
                }
                const payload = (await response.json()) as {
                  data?: OperationalAlertResponse;
                };
                setAlerts(payload.data ?? null);
              },
            ),
          );
        }
        await Promise.all(tasks);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load your workspace.",
        );
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const canReadReports = Boolean(
    session && sessionCan(session, "reports.read"),
  );
  const canReadOrders = Boolean(session && sessionCan(session, "orders.read"));
  const canReadPayments = Boolean(
    session && sessionCan(session, "payments.read"),
  );
  const canReadReconciliation = Boolean(
    session && sessionCan(session, "reconciliation.read"),
  );
  const hasFinanceAccess = Boolean(
    session &&
    ["reports.read", "payments.read", "refunds.read", "settlements.read"].some(
      (permission) => sessionCan(session, permission),
    ),
  );
  const hasOperationsAccess = Boolean(
    session &&
    [
      "orders.read",
      "shipping.read",
      "returns.read",
      "reconciliation.read",
    ].some((permission) => sessionCan(session, permission)),
  );
  const workspace =
    session?.role === "admin"
      ? "Owner workspace"
      : hasFinanceAccess && !hasOperationsAccess
        ? "Finance workspace"
        : hasOperationsAccess && !hasFinanceAccess
          ? "Operations workspace"
          : "Assigned workspace";
  const workspaceLinks = session
    ? [
        {
          permission: "orders.read",
          title: "Orders",
          detail: "Confirmation and fulfillment queues",
          href: "/dashboard/orders",
        },
        {
          permission: "payments.read",
          title: "Payments",
          detail: "Prepaid attempts and refund evidence",
          href: "/dashboard/payments",
        },
        {
          permission: "shipping.read",
          title: "Shipping",
          detail: "Courier shipments, callbacks, and polling",
          href: "/dashboard/shipping",
        },
        {
          permission: "returns.read",
          title: "Returns",
          detail: "Return review, inspection, and resolution",
          href: "/dashboard/returns",
        },
        {
          permission: "reconciliation.read",
          title: "Reconciliation",
          detail: "Cross-domain findings and settlement evidence",
          href: "/dashboard/reconciliation",
        },
        {
          permission: "reconciliation.read",
          title: "System health",
          detail: "Runtime, queue, provider, backup, and restore evidence",
          href: "/dashboard/operations-health",
        },
        {
          permission: "reports.read",
          title: "Reports",
          detail: "Delivered outcomes, collection, and refunds",
          href: "/dashboard/reports",
        },
      ].filter((item) => sessionCan(session, item.permission))
    : [];

  return (
    <>
      <Topbar
        title="Overview"
        subtitle={
          session ? `${workspace} · ${session.email}` : "Loading access"
        }
      />
      <main className="space-y-8 p-8">
        {error && (
          <p role="alert" className="text-[12px] text-rose-700">
            {error}
          </p>
        )}

        {workspaceLinks.length > 0 && (
          <section>
            <div className="mb-4">
              <h2 className="text-[16px] font-medium text-ink">
                Assigned tools
              </h2>
              <p className="mt-1 text-[12px] text-ink2">
                Only capabilities granted to this account are shown.
              </p>
            </div>
            <div className="grid gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-2 xl:grid-cols-3">
              {workspaceLinks.map((item) => (
                <Link key={item.href} href={item.href} className="bg-white p-5">
                  <p className="text-[13px] font-medium text-ink">
                    {item.title}
                  </p>
                  <p className="mt-1 text-[11px] leading-5 text-ink2">
                    {item.detail}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {canReadReports && report && (
          <section>
            <SectionHeading
              title="Finance and outcomes"
              detail={`${report.basis.dateFrom} — ${report.basis.dateTo} order-created cohort`}
              href="/dashboard/reports"
              action="Full reports"
            />
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
              <StatCard
                label="Gross delivered"
                value={formatTaka(report.revenue.grossDelivered)}
                hint="Delivered basis"
                href="/dashboard/reports"
              />
              <StatCard
                label="Known collected"
                value={formatTaka(report.revenue.knownCollected)}
                hint="Recorded collection"
                href={
                  canReadReconciliation
                    ? "/dashboard/reconciliation"
                    : "/dashboard/reports"
                }
              />
              <StatCard
                label="Net of refunds"
                value={formatTaka(report.revenue.netOfRefund)}
                hint="Not contribution"
                href="/dashboard/reports"
              />
              <StatCard
                label="Refund amount"
                value={formatTaka(report.finance.refundAmount)}
                href={
                  canReadPayments
                    ? "/dashboard/payments?refundStatus=REFUNDED"
                    : "/dashboard/reports"
                }
              />
              <StatCard
                label="Unresolved COD"
                value={String(report.finance.unresolvedCodCollections)}
                href={
                  canReadReconciliation
                    ? "/dashboard/reconciliation"
                    : "/dashboard/reports"
                }
              />
              <StatCard
                label="Contribution"
                value="Unavailable"
                hint="Cost inputs missing"
              />
            </div>
          </section>
        )}

        {canReadOrders && operations && (
          <section>
            <SectionHeading
              title="Operations queues"
              detail="Live server-filtered order counts."
              href="/dashboard/orders"
              action="All orders"
            />
            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard
                label="Needs confirmation"
                value={String(operations.pendingConfirmation)}
                href="/dashboard/orders?status=PENDING_CONFIRMATION"
              />
              <StatCard
                label="Ready for fulfillment"
                value={String(operations.readyForFulfillment)}
                href="/dashboard/orders?fulfillmentStatus=READY_FOR_FULFILLMENT"
              />
              <StatCard
                label="Ready for handover"
                value={String(operations.readyForHandover)}
                href="/dashboard/orders?fulfillmentStatus=READY_FOR_HANDOVER"
              />
            </div>
          </section>
        )}

        <OperationalAlerts data={alerts} unavailable={alertsUnavailable} />

        {canReadOrders && (
          <div className="grid grid-cols-1 gap-8 xl:grid-cols-3">
            <RecentOrders orders={orders} loading={loading} />
            <LivePageVisitorsCard />
          </div>
        )}

        {!loading && !canReadReports && !canReadOrders && !alerts && (
          <section className="rounded-card border border-line p-6">
            <h2 className="text-[15px] font-medium text-ink">
              No overview data assigned
            </h2>
            <p className="mt-2 max-w-2xl text-[12px] leading-5 text-ink2">
              Use the navigation available to your account. An owner can grant
              reports, orders, or reconciliation access when required.
            </p>
          </section>
        )}
      </main>
    </>
  );
}

function SectionHeading({
  title,
  detail,
  href,
  action,
}: {
  title: string;
  detail: string;
  href: string;
  action: string;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-[16px] font-medium text-ink">{title}</h2>
        <p className="mt-1 text-[12px] text-ink2">{detail}</p>
      </div>
      <Link
        href={href}
        className="text-[12px] text-ink underline decoration-line underline-offset-4"
      >
        {action}
      </Link>
    </div>
  );
}

function RecentOrders({
  orders,
  loading,
}: {
  orders: OrderPage["items"];
  loading: boolean;
}) {
  return (
    <section className="rounded-card border border-line bg-white xl:col-span-2">
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <div>
          <h2 className="text-[13px] font-medium text-ink">Recent orders</h2>
          <p className="mt-0.5 text-[11px] text-ink2">Live backend data</p>
        </div>
        <Link
          href="/dashboard/orders"
          className="text-[12px] text-ink2 hover:text-ink"
        >
          View all
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] text-left">
          <thead>
            <tr className="text-[11px] uppercase tracking-eyebrow text-ink2">
              <th className="w-24 px-4 py-3 font-normal">Id</th>
              <th className="px-5 py-3 font-normal">Customer</th>
              <th className="px-5 py-3 font-normal">Area</th>
              <th className="px-5 py-3 font-normal">Total</th>
              <th className="px-5 py-3 font-normal">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {orders.map((order) => (
              <tr key={order.id} className="text-[13px] text-ink/80">
                <td className="w-24 px-4 py-3.5">
                  <CopyableId
                    id={order.id}
                    displayValue={order.reference}
                    href={`/dashboard/orders/${order.id}`}
                  />
                </td>
                <td className="px-5 py-3.5">{order.customer.name}</td>
                <td className="px-5 py-3.5 text-ink2">
                  {order.address
                    ? `${order.address.area}, ${order.address.district}`
                    : "—"}
                </td>
                <td className="px-5 py-3.5">{formatTaka(order.total)}</td>
                <td className="px-5 py-3.5">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] ${orderStatusClass[order.status]}`}
                  >
                    {order.status.replaceAll("_", " ").toLowerCase()}
                  </span>
                </td>
              </tr>
            ))}
            {!loading && orders.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-5 py-14 text-center text-[13px] text-ink2"
                >
                  No orders match this workspace.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
