import Link from "next/link";
import Topbar from "@/components/Topbar";
import { adminApi } from "@/lib/admin-api";
import type { CustomerPage } from "@/lib/customers";
import { formatTaka } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: { page?: string; search?: string };
}) {
  const requestedPage = Number(searchParams.page || 1);
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const search = searchParams.search?.trim() ?? "";
  const query = new URLSearchParams({ page: String(page), limit: "25" });
  if (search) query.set("search", search);
  let customers: CustomerPage = { items: [], page, limit: 25, total: 0, totalPages: 0 };
  let error = "";
  try {
    customers = await adminApi<CustomerPage>(`/admin/customers?${query}`);
  } catch (requestError) {
    error = requestError instanceof Error ? requestError.message : "Unable to load customers.";
  }
  const pageHref = (target: number) => {
    const params = new URLSearchParams({ page: String(target) });
    if (search) params.set("search", search);
    return `/dashboard/customers?${params}`;
  };

  return (
    <>
      <Topbar title="Customers" subtitle={`${customers.total} customer profiles`} />
      <main className="p-8">
        <div className="mx-auto max-w-7xl">
          <form className="mb-7 flex flex-wrap justify-end gap-3">
            <input name="search" defaultValue={search} placeholder="Name, phone, or email" className="w-72 rounded-full border border-line px-4 py-2 text-[13px] outline-none focus:border-ink" />
            <button className="rounded-full bg-ink px-5 py-2 text-[13px] text-white">Search</button>
          </form>
          {error ? <p role="alert" className="mb-5 text-[13px] text-rose-700">{error}</p> : null}
          <div className="overflow-x-auto rounded-card border border-line">
            <table className="w-full min-w-[980px] text-left">
              <thead><tr className="text-[11px] uppercase tracking-eyebrow text-ink2"><th className="px-5 py-3 font-normal">Customer</th><th className="px-5 py-3 font-normal">Delivered</th><th className="px-5 py-3 font-normal">Delivered spend</th><th className="px-5 py-3 font-normal">Cancelled</th><th className="px-5 py-3 font-normal">Returns</th><th className="px-5 py-3 font-normal">Last purchase</th><th className="px-5 py-3 font-normal">Context</th></tr></thead>
              <tbody className="divide-y divide-line">
                {customers.items.map((customer) => <tr key={customer.id} className="text-[13px] text-ink/80"><td className="px-5 py-4"><Link href={`/dashboard/customers/${customer.id}`} className="font-medium text-ink hover:underline">{customer.name}</Link><p className="mt-1 text-[11px] text-ink2">{customer.phone}{customer.email ? ` · ${customer.email}` : ""}</p></td><td className="px-5 py-4 text-ink">{customer.deliveredOrderCount}</td><td className="px-5 py-4 text-ink">{formatTaka(customer.deliveredSpend)}</td><td className="px-5 py-4">{customer.cancelledOrderCount}</td><td className="px-5 py-4">{customer.returnedOrderCount}</td><td className="px-5 py-4 text-ink2">{customer.lastPurchaseAt ? new Date(customer.lastPurchaseAt).toLocaleDateString("en-BD") : "—"}</td><td className="px-5 py-4"><p className="text-ink2">{customer.latestAttribution?.source || "Direct / unknown"}</p>{customer.riskIndicators.length ? <p className="mt-1 text-[11px] text-amber-700">{customer.riskIndicators.length} attention indicator{customer.riskIndicators.length === 1 ? "" : "s"}</p> : <p className="mt-1 text-[11px] text-ink2">No attention indicators</p>}</td></tr>)}
                {!customers.items.length ? <tr><td colSpan={7} className="px-5 py-14 text-center text-[13px] text-ink2">{error || "No customers match this view."}</td></tr> : null}
              </tbody>
            </table>
          </div>
          {customers.totalPages > 1 ? <nav aria-label="Customer pages" className="mt-7 flex items-center justify-between text-[13px]"><span>{customers.page > 1 ? <Link href={pageHref(customers.page - 1)} className="underline underline-offset-4">Previous</Link> : null}</span><span className="text-ink2">Page {customers.page} of {customers.totalPages}</span><span>{customers.page < customers.totalPages ? <Link href={pageHref(customers.page + 1)} className="underline underline-offset-4">Next</Link> : null}</span></nav> : null}
        </div>
      </main>
    </>
  );
}
