import Link from "next/link";
import Topbar from "@/components/Topbar";
import CustomerPagination from "@/components/CustomerPagination";
import CopyableId from "@/components/CopyableId";
import { adminApi } from "@/lib/admin-api";
import type { CustomerPage } from "@/lib/customers";
import { formatTaka } from "@/lib/catalog";

export const dynamic = "force-dynamic";

function formatLastOnline(lastOnlineAt?: string | null): { text: string; badgeClass: string } {
  if (!lastOnlineAt) {
    return { text: "Never / Unknown", badgeClass: "bg-slate-100 text-slate-600" };
  }
  const date = new Date(lastOnlineAt);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours < 1) {
    return { text: "Online Now", badgeClass: "bg-emerald-100 text-emerald-800 font-semibold" };
  } else if (diffHours < 24) {
    const hrs = Math.floor(diffHours);
    return { text: `Active ${hrs}h ago`, badgeClass: "bg-emerald-50 text-emerald-700" };
  } else if (diffHours < 24 * 7) {
    const days = Math.floor(diffHours / 24);
    return { text: `Active ${days}d ago`, badgeClass: "bg-blue-50 text-blue-700" };
  } else {
    return { text: date.toLocaleDateString("en-BD", { month: "short", day: "numeric", year: "numeric" }), badgeClass: "bg-slate-50 text-slate-700" };
  }
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: { page?: string; search?: string; filter?: string; month?: string; sort?: string };
}) {
  const requestedPage = Number(searchParams.page || 1);
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const search = searchParams.search?.trim() ?? "";
  const filter = searchParams.filter ?? "ALL";
  const month = searchParams.month ?? "";
  const sort = searchParams.sort ?? "RECENT_ONLINE";

  const query = new URLSearchParams({ page: String(page), limit: "25" });
  if (search) query.set("search", search);
  if (filter && filter !== "ALL") query.set("filter", filter);
  if (month) query.set("month", month);
  if (sort) query.set("sort", sort);

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
    if (filter && filter !== "ALL") params.set("filter", filter);
    if (month) params.set("month", month);
    if (sort) params.set("sort", sort);
    return `/dashboard/customers?${params}`;
  };

  return (
    <>
      <Topbar title="Customers" subtitle={`${customers.total} customer profiles`} />
      <main className="p-8">
        <div className="mx-auto max-w-7xl">
          {/* Controls Bar */}
          <div className="mb-7 flex flex-wrap items-center justify-between gap-4 border-b border-line pb-5">
            {/* Activity Quick Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[12px] font-medium text-ink2">Activity Filter:</span>
              <Link
                href={`/dashboard/customers?${new URLSearchParams({ search, filter: "ALL", sort, month })}`}
                className={`rounded-full px-3.5 py-1.5 text-[12px] font-medium transition ${
                  filter === "ALL" && !month ? "bg-ink text-white" : "border border-line bg-white text-ink2 hover:text-ink"
                }`}
              >
                All Customers
              </Link>
              <Link
                href={`/dashboard/customers?${new URLSearchParams({ search, filter: "LAST_7_DAYS", sort })}`}
                className={`rounded-full px-3.5 py-1.5 text-[12px] font-medium transition ${
                  filter === "LAST_7_DAYS" ? "bg-ink text-white" : "border border-line bg-white text-ink2 hover:text-ink"
                }`}
              >
                Active Last 7 Days
              </Link>
              <Link
                href={`/dashboard/customers?${new URLSearchParams({ search, filter: "LAST_30_DAYS", sort })}`}
                className={`rounded-full px-3.5 py-1.5 text-[12px] font-medium transition ${
                  filter === "LAST_30_DAYS" ? "bg-ink text-white" : "border border-line bg-white text-ink2 hover:text-ink"
                }`}
              >
                Active Last 30 Days
              </Link>
            </div>

            {/* Search & Month Filter Form */}
            <form className="flex flex-wrap items-center gap-3">
              <select
                name="month"
                defaultValue={month}
                className="rounded-full border border-line bg-white px-3 py-2 text-[12px] text-ink outline-none focus:border-ink"
              >
                <option value="">Filter by Month...</option>
                <option value="2026-08">August 2026</option>
                <option value="2026-07">July 2026</option>
                <option value="2026-06">June 2026</option>
                <option value="2026-05">May 2026</option>
                <option value="2026-04">April 2026</option>
              </select>

              <select
                name="sort"
                defaultValue={sort}
                className="rounded-full border border-line bg-white px-3 py-2 text-[12px] text-ink outline-none focus:border-ink"
              >
                <option value="RECENT_ONLINE">Sort: Most Recently Active</option>
                <option value="OLDEST_ONLINE">Sort: Oldest Active</option>
                <option value="NAME_ASC">Sort: Name (A-Z)</option>
              </select>

              <input
                name="search"
                defaultValue={search}
                placeholder="Name, phone, or email"
                className="w-60 rounded-full border border-line px-4 py-2 text-[13px] outline-none focus:border-ink"
              />
              <button className="rounded-full bg-ink px-5 py-2 text-[13px] text-white">Apply</button>
            </form>
          </div>

          {error ? <p role="alert" className="mb-5 text-[13px] text-rose-700">{error}</p> : null}

          <div className="overflow-x-auto rounded-card border border-line">
            <table className="w-full min-w-[1020px] text-left">
              <thead>
                <tr className="text-[11px] uppercase tracking-eyebrow text-ink2">
                  <th className="px-4 py-3 font-normal w-24">Id</th>
                  <th className="px-5 py-3 font-normal">Customer Profile</th>
                  <th className="px-5 py-3 font-normal">Last Online</th>
                  <th className="px-5 py-3 font-normal">Delivered</th>
                  <th className="px-5 py-3 font-normal">Delivered spend</th>
                  <th className="px-5 py-3 font-normal">Cancelled / Returns</th>
                  <th className="px-5 py-3 font-normal">Last purchase</th>
                  <th className="px-5 py-3 font-normal">Context</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {customers.items.map((customer) => {
                  const onlineMeta = formatLastOnline(customer.lastOnlineAt);
                  return (
                    <tr key={customer.id} className="text-[13px] text-ink/80">
                      <td className="px-4 py-4 w-24">
                        <CopyableId id={customer.id} />
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          {customer.avatarUrl ? (
                            <img
                              src={customer.avatarUrl}
                              alt={customer.name}
                              className="h-9 w-9 rounded-full object-cover border border-line shadow-xs"
                            />
                          ) : (
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-800 font-semibold text-xs">
                              {customer.name.slice(0, 2).toUpperCase()}
                            </div>
                          )}

                          <div>
                            <Link href={`/dashboard/customers/${customer.id}`} className="font-medium text-ink hover:underline">
                              {customer.name}
                            </Link>
                            <p className="mt-0.5 text-[11px] text-ink2">
                              {customer.phone}{customer.email ? ` · ${customer.email}` : ""}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span className={`inline-block rounded-full px-2.5 py-1 text-[11px] ${onlineMeta.badgeClass}`}>
                          {onlineMeta.text}
                        </span>
                        {customer.lastOnlineAt && (
                          <p className="mt-1 text-[10px] text-ink2">
                            {new Date(customer.lastOnlineAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-4 text-ink font-medium">{customer.deliveredOrderCount}</td>
                      <td className="px-5 py-4 text-ink font-medium">{formatTaka(customer.deliveredSpend)}</td>
                      <td className="px-5 py-4">{customer.cancelledOrderCount} / {customer.returnedOrderCount}</td>
                      <td className="px-5 py-4 text-ink2">
                        {customer.lastPurchaseAt ? new Date(customer.lastPurchaseAt).toLocaleDateString("en-BD") : "—"}
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-ink2">{customer.latestAttribution?.source || "Direct / unknown"}</p>
                        {customer.riskIndicators.length ? (
                          <p className="mt-1 text-[11px] text-amber-700 font-medium">
                            {customer.riskIndicators.length} attention indicator{customer.riskIndicators.length === 1 ? "" : "s"}
                          </p>
                        ) : (
                          <p className="mt-1 text-[11px] text-ink2">No attention indicators</p>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {!customers.items.length ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-14 text-center text-[13px] text-ink2">
                      {error || "No customers match this activity filter."}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
            <CustomerPagination
              currentPage={customers.page}
              totalPages={customers.totalPages}
              totalItems={customers.total}
              pageSize={customers.limit}
            />
          </div>
        </div>
      </main>
    </>
  );
}
