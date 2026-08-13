import Link from "next/link";
import { notFound } from "next/navigation";
import Topbar from "@/components/Topbar";
import { AdminApiError, adminApi } from "@/lib/admin-api";
import { formatTaka } from "@/lib/catalog";
import type { CustomerDetail } from "@/lib/customers";
import { orderStatusClass } from "@/lib/orders";

export const dynamic = "force-dynamic";

export default async function CustomerDetailPage({ params }: { params: { id: string } }) {
  let customer: CustomerDetail;
  try {
    customer = await adminApi<CustomerDetail>(`/admin/customers/${params.id}`);
  } catch (error) {
    if (error instanceof AdminApiError && error.status === 404) notFound();
    throw error;
  }
  const metric = customer.metrics;
  return (
    <>
      <Topbar title={customer.name} subtitle={`${metric.deliveredOrderCount} delivered orders · ${formatTaka(metric.deliveredSpend)} delivered spend`} />
      <main className="p-8"><div className="mx-auto max-w-6xl space-y-10">
        <div><Link href="/dashboard/customers" className="text-[12px] text-ink2 underline underline-offset-4">Back to customers</Link></div>
        <section className="grid gap-px overflow-hidden rounded-card border border-line bg-line md:grid-cols-4">
          {[["Delivered", metric.deliveredOrderCount], ["Cancelled", metric.cancelledOrderCount], ["Returns", metric.returnedOrderCount], ["RTO", metric.rtoOrderCount]].map(([label, value]) => <div key={label} className="bg-paper p-5"><p className="text-[11px] uppercase tracking-eyebrow text-ink2">{label}</p><p className="mt-2 text-[24px] font-semibold tracking-tight text-ink">{value}</p></div>)}
        </section>
        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <div className="space-y-8">
            <section className="border-b border-line pb-8"><h2 className="text-[17px] font-medium text-ink">Contact</h2><dl className="mt-5 space-y-3 text-[13px]"><div><dt className="text-[11px] text-ink2">Normalized phone</dt><dd className="mt-0.5 text-ink">{customer.phoneNormalized}</dd></div><div><dt className="text-[11px] text-ink2">Customer input</dt><dd className="mt-0.5 text-ink">{customer.phoneOriginal}</dd></div><div><dt className="text-[11px] text-ink2">Email</dt><dd className="mt-0.5 text-ink">{customer.email || "Not provided"}</dd></div></dl></section>
            <section className="border-b border-line pb-8"><h2 className="text-[17px] font-medium text-ink">Operational indicators</h2>{customer.riskIndicators.length ? <ul className="mt-4 space-y-2">{customer.riskIndicators.map((indicator) => <li key={indicator.code} className="rounded-card bg-amber-50 px-3 py-2 text-[12px] text-amber-700">{indicator.label}</li>)}</ul> : <p className="mt-4 text-[13px] text-ink2">No configured attention indicators from current order evidence.</p>}<p className="mt-3 text-[11px] leading-5 text-ink2">Indicators describe recorded outcomes only. They do not automatically block checkout or make an identity decision.</p></section>
            <section><h2 className="text-[17px] font-medium text-ink">Saved addresses · {customer._count.addresses}</h2><div className="mt-4 divide-y divide-line border-y border-line">{customer.addresses.map((address) => <article key={address.id} className="py-4 text-[13px]"><p className="font-medium text-ink">{address.label || "Address"}{address.isDefault ? " · default" : ""}</p><p className="mt-1 leading-5 text-ink2">{address.detailedAddress}, {address.area}, {address.district}{address.landmark ? ` · ${address.landmark}` : ""}</p></article>)}{!customer.addresses.length ? <p className="py-5 text-[13px] text-ink2">No reusable addresses saved.</p> : null}</div></section>
          </div>
          <section><div className="flex items-end justify-between border-b border-line pb-4"><div><h2 className="text-[17px] font-medium text-ink">Order history</h2><p className="mt-1 text-[12px] text-ink2">{customer._count.orders} total orders{customer.orderHistoryTruncated ? ` · showing latest ${customer.orderHistoryLimit}` : ""}</p></div></div><div className="divide-y divide-line">{customer.orders.map((order) => <article key={order.id} className="py-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><Link href={`/dashboard/orders/${order.id}`} className="text-[14px] font-medium text-ink hover:underline">{order.reference}</Link><p className="mt-1 text-[11px] text-ink2">{new Date(order.createdAt).toLocaleString("en-BD")} · {order._count.items} item{order._count.items === 1 ? "" : "s"}</p></div><span className={`rounded-full px-2.5 py-1 text-[11px] ${orderStatusClass[order.status]}`}>{order.status.replaceAll("_", " ").toLowerCase()}</span></div><div className="mt-4 grid grid-cols-2 gap-3 text-[12px] md:grid-cols-4"><p><span className="block text-[10px] uppercase tracking-eyebrow text-ink2">Total</span>{formatTaka(order.total)}</p><p><span className="block text-[10px] uppercase tracking-eyebrow text-ink2">Payment</span>{order.paymentMethod} · {order.paymentStatus.toLowerCase()}</p><p><span className="block text-[10px] uppercase tracking-eyebrow text-ink2">Delivery</span>{order.shipmentStatus.replaceAll("_", " ").toLowerCase()}</p><p><span className="block text-[10px] uppercase tracking-eyebrow text-ink2">Destination</span>{order.address ? `${order.address.area}, ${order.address.district}` : "—"}</p></div></article>)}{!customer.orders.length ? <p className="py-12 text-center text-[13px] text-ink2">No order history.</p> : null}</div></section>
        </div>
      </div></main>
    </>
  );
}
