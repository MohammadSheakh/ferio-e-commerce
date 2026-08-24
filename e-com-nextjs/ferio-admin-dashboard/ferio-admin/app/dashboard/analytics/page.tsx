"use client";

import { useEffect, useState } from "react";

type AnalyticsData = {
  summary: {
    totalRevenue: number;
    totalOrders: number;
    productViews: number;
    searchCount: number;
    addToCartCount: number;
  };
  dailyTrend: Array<{ date: string; revenue: number; orders: number }>;
  topSearches: Array<{ query: string; count: number }>;
  zeroResultSearches: Array<{ query: string; count: number; isZeroResult?: boolean }>;
  viewedButNotPurchased: Array<{
    productId: string;
    productName: string;
    slug: string;
    price: number;
    views: number;
    purchases: number;
    conversionRate: string;
  }>;
  funnel: {
    productViews: number;
    addToCart: number;
    checkoutBegin: number;
    purchased: number;
  };
};

const formatTaka = (amount: number) =>
  new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  }).format(amount / 100);

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadAnalytics(selectedDays: number) {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/analytics/dashboard?days=${selectedDays}`, {
        cache: "no-store",
      });
      const payload = await response.json();
      if (response.ok && payload.data) {
        setData(payload.data);
      } else {
        setError(payload.message || "Unable to load analytics data.");
      }
    } catch {
      setError("Unable to connect to analytics service.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAnalytics(days);
  }, [days]);

  const maxRevenue = data?.dailyTrend.length
    ? Math.max(...data.dailyTrend.map((d) => d.revenue), 1)
    : 1;

  return (
    <main className="space-y-8 p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500 font-semibold">
            Store & Behavior Intelligence
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">
            Cheap + Maintainable Analytics
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Real-time customer journey insights, conversion funnels, search demand, and revenue trends.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
          <button
            onClick={() => setDays(7)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              days === 7
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Last 7 Days
          </button>
          <button
            onClick={() => setDays(30)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              days === 30
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Last 30 Days
          </button>
          <button
            onClick={() => setDays(90)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              days === 90
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Last 90 Days
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {error}
        </div>
      )}

      {/* Metric Cards */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Delivered Revenue
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {loading ? "…" : formatTaka(data?.summary.totalRevenue ?? 0)}
          </p>
          <p className="mt-1 text-[11px] text-emerald-600 font-medium">
            Over last {days} days
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Total Orders
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {loading ? "…" : (data?.summary.totalOrders ?? 0)}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">Completed purchases</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Product Views
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {loading ? "…" : (data?.summary.productViews ?? 0)}
          </p>
          <p className="mt-1 text-[11px] text-blue-600 font-medium">Storefront engagement</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Search Queries
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {loading ? "…" : (data?.summary.searchCount ?? 0)}
          </p>
          <p className="mt-1 text-[11px] text-purple-600 font-medium">Keyword searches</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Cart Additions
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {loading ? "…" : (data?.summary.addToCartCount ?? 0)}
          </p>
          <p className="mt-1 text-[11px] text-amber-600 font-medium">Intent to buy</p>
        </div>
      </section>

      {/* Revenue & Trend Chart */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Daily Revenue Trend
            </h2>
            <p className="text-xs text-slate-500">
              Revenue snapshot aggregated over the past {days} days.
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
            Total {data?.dailyTrend.length ?? 0} Days Tracked
          </span>
        </div>

        {loading ? (
          <div className="flex h-48 items-center justify-center text-xs text-slate-400">
            Loading trend visualization…
          </div>
        ) : data?.dailyTrend.length ? (
          <div className="mt-6 flex h-48 items-end gap-1.5 border-b border-slate-200 pb-2">
            {data.dailyTrend.map((item) => {
              const heightPercent = Math.max(
                4,
                Math.round((item.revenue / maxRevenue) * 100),
              );
              return (
                <div
                  key={item.date}
                  className="group relative flex flex-1 flex-col items-center justify-end"
                >
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className="w-full rounded-t bg-slate-900 transition-all group-hover:bg-indigo-600"
                  />
                  <div className="pointer-events-none absolute -top-12 z-20 hidden rounded-md bg-slate-900 px-2.5 py-1.5 text-[10px] text-white shadow-lg group-hover:block whitespace-nowrap">
                    <p className="font-semibold">{item.date}</p>
                    <p>{formatTaka(item.revenue)} · {item.orders} orders</p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex h-48 items-center justify-center text-xs text-slate-400">
            No revenue recorded in this period.
          </div>
        )}
      </section>

      {/* Conversion Funnel */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">
          Conversion Funnel Breakdown
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">
          User progression from browsing products to order completion.
        </p>

        {data?.funnel && (
          <div className="mt-6 grid gap-4 sm:grid-cols-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold text-slate-600">1. Product Views</p>
              <p className="mt-2 text-xl font-bold text-slate-900">
                {data.funnel.productViews}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">100% Top of Funnel</p>
            </div>

            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <p className="text-xs font-semibold text-blue-900">2. Add to Cart</p>
              <p className="mt-2 text-xl font-bold text-blue-950">
                {data.funnel.addToCart}
              </p>
              <p className="mt-1 text-[11px] text-blue-700">
                {data.funnel.productViews > 0
                  ? `${((data.funnel.addToCart / data.funnel.productViews) * 100).toFixed(1)}% conversion`
                  : "0%"}
              </p>
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs font-semibold text-amber-900">3. Checkout Drafts</p>
              <p className="mt-2 text-xl font-bold text-amber-950">
                {data.funnel.checkoutBegin}
              </p>
              <p className="mt-1 text-[11px] text-amber-700">
                {data.funnel.addToCart > 0
                  ? `${((data.funnel.checkoutBegin / data.funnel.addToCart) * 100).toFixed(1)}% proceed rate`
                  : "0%"}
              </p>
            </div>

            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-xs font-semibold text-emerald-900">4. Paid Orders</p>
              <p className="mt-2 text-xl font-bold text-emerald-950">
                {data.funnel.purchased}
              </p>
              <p className="mt-1 text-[11px] text-emerald-700">
                {data.funnel.productViews > 0
                  ? `${((data.funnel.purchased / data.funnel.productViews) * 100).toFixed(1)}% overall conversion`
                  : "0%"}
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Tables Section: Searches & Viewed but Unsold */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Top & Zero Search Queries */}
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Top & Missing Search Keywords
              </h2>
              <p className="text-xs text-slate-500">
                Identify demand & products customers searched for.
              </p>
            </div>
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-semibold text-amber-800">
              Demand Insights
            </span>
          </div>

          <div className="mt-4 divide-y divide-slate-100">
            {data?.topSearches.length ? (
              data.topSearches.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-700">
                      {idx + 1}
                    </span>
                    <span className="text-sm font-medium text-slate-800">
                      &quot;{item.query}&quot;
                    </span>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    {item.count} searches
                  </span>
                </div>
              ))
            ) : (
              <p className="py-8 text-center text-xs text-slate-400">
                No search keywords recorded yet.
              </p>
            )}

            {data?.zeroResultSearches.length ? (
              <div className="pt-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-rose-600 mb-2">
                  Zero-Result Searches (Add Stock/Products)
                </p>
                {data.zeroResultSearches.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between py-2 text-rose-900">
                    <span className="text-xs font-medium">
                      ❌ &quot;{item.query}&quot;
                    </span>
                    <span className="rounded bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-800">
                      {item.count} missing queries
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </section>

        {/* Most Viewed but Not Purchased */}
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Most Viewed (Unsold / Low Sales)
              </h2>
              <p className="text-xs text-slate-500">
                High traffic products that might have pricing or stock barriers.
              </p>
            </div>
            <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-[10px] font-semibold text-indigo-800">
              Pricing Optimization
            </span>
          </div>

          <div className="mt-4 divide-y divide-slate-100">
            {data?.viewedButNotPurchased.length ? (
              data.viewedButNotPurchased.map((item) => (
                <div key={item.productId} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {item.productName}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {formatTaka(item.price)} · {item.views} views · {item.purchases} sales
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">
                      {item.conversionRate} Conv.
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="py-8 text-center text-xs text-slate-400">
                No high-view unsold products flagged.
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
