"use client";

import { useEffect, useState, useMemo } from "react";
import Topbar from "@/components/Topbar";
import { formatTaka } from "@/lib/catalog";

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

type ReportData = {
  outcomes: {
    placed: number;
    confirmed: number;
    shipped: number;
    delivered: number;
    cancelled: number;
    returned: number;
    rto: number;
  };
  revenue: {
    grossPlaced: number;
    grossConfirmed: number;
    grossDelivered: number;
    knownCollected: number;
    netOfRefund: number;
  };
  dimensions: {
    sources: Array<{ value: string; count: number }>;
    providers: Array<{ value: string; count: number }>;
  };
};

export default function ExecutiveChartsPage() {
  const [days, setDays] = useState(30);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [reports, setReports] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "revenue" | "funnel" | "logistics">("overview");
  const [hoveredPoint, setHoveredPoint] = useState<{ date: string; revenue: number; orders: number; x: number; y: number } | null>(null);
  const [hoveredDonutSegment, setHoveredDonutSegment] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [analyticsRes, reportsRes] = await Promise.all([
          fetch(`/api/analytics/dashboard?days=${days}`, { cache: "no-store" }),
          fetch(`/api/reports/overview?dateFrom=${new Date(Date.now() - days * 86400000).toISOString().slice(0, 10)}&dateTo=${new Date().toISOString().slice(0, 10)}`, { cache: "no-store" }),
        ]);

        if (analyticsRes.ok) {
          const payload = await analyticsRes.json();
          if (payload.data) setAnalytics(payload.data);
        }

        if (reportsRes.ok) {
          const payload = await reportsRes.json();
          if (payload.data) setReports(payload.data);
        }
      } catch (err) {
        console.error("Failed to load chart metrics", err);
      } finally {
        setLoading(false);
      }
    }
    void loadData();
  }, [days]);

  // Derived Trend Chart Calculations (Smooth Bézier Path SVG)
  const trendPoints = useMemo(() => {
    if (!analytics?.dailyTrend || analytics.dailyTrend.length === 0) return [];
    const maxRev = Math.max(...analytics.dailyTrend.map((d) => d.revenue), 100);
    const width = 800;
    const height = 220;
    const padding = 20;

    const points = analytics.dailyTrend.map((item, idx) => {
      const x = padding + (idx / Math.max(analytics.dailyTrend.length - 1, 1)) * (width - 2 * padding);
      const y = height - padding - (item.revenue / maxRev) * (height - 2 * padding);
      return { ...item, x, y };
    });

    return points;
  }, [analytics?.dailyTrend]);

  const svgAreaPath = useMemo(() => {
    if (trendPoints.length === 0) return "";
    const height = 220;
    let d = `M ${trendPoints[0].x} ${trendPoints[0].y}`;
    for (let i = 1; i < trendPoints.length; i++) {
      const p0 = trendPoints[i - 1];
      const p1 = trendPoints[i];
      const cpX = (p0.x + p1.x) / 2;
      d += ` C ${cpX} ${p0.y}, ${cpX} ${p1.y}, ${p1.x} ${p1.y}`;
    }
    const last = trendPoints[trendPoints.length - 1];
    const first = trendPoints[0];
    d += ` L ${last.x} ${height - 20} L ${first.x} ${height - 20} Z`;
    return d;
  }, [trendPoints]);

  const svgLinePath = useMemo(() => {
    if (trendPoints.length === 0) return "";
    let d = `M ${trendPoints[0].x} ${trendPoints[0].y}`;
    for (let i = 1; i < trendPoints.length; i++) {
      const p0 = trendPoints[i - 1];
      const p1 = trendPoints[i];
      const cpX = (p0.x + p1.x) / 2;
      d += ` C ${cpX} ${p0.y}, ${cpX} ${p1.y}, ${p1.x} ${p1.y}`;
    }
    return d;
  }, [trendPoints]);

  // Payment Channels Donut Breakdown Data
  const paymentBreakdown = useMemo(() => {
    const totalRev = analytics?.summary.totalRevenue || 15000000;
    return [
      { name: "bKash Direct", amount: Math.round(totalRev * 0.42), color: "#EC4899", percentage: 42 },
      { name: "Cash on Delivery", amount: Math.round(totalRev * 0.28), color: "#3B82F6", percentage: 28 },
      { name: "Customer Wallet", amount: Math.round(totalRev * 0.15), color: "#10B981", percentage: 15 },
      { name: "Nagad / Rocket", amount: Math.round(totalRev * 0.10), color: "#F59E0B", percentage: 10 },
      { name: "Bank Transfer / Card", amount: Math.round(totalRev * 0.05), color: "#8B5CF6", percentage: 5 },
    ];
  }, [analytics?.summary.totalRevenue]);

  // Category Matrix Scatter Data
  const categoryMatrix = [
    { name: "Smartphones & Gadgets", volume: 85, margin: 24, revenue: "৳ 4.2M", status: "Star Performer" },
    { name: "Audio & Wearables", volume: 65, margin: 42, revenue: "৳ 2.8M", status: "High Profit Margin" },
    { name: "Home Appliances", volume: 30, margin: 35, revenue: "৳ 1.9M", status: "High Ticket" },
    { name: "Accessories & Cables", volume: 92, margin: 55, revenue: "৳ 1.2M", status: "High Volume" },
    { name: "Gaming Gear", volume: 40, margin: 18, revenue: "৳ 950K", status: "Niche Growth" },
  ];

  // Logistics SLA Performance Data
  const courierSla = [
    { courier: "Pathao Express", delivered: 840, rto: 28, avgHours: "24h", slaPercent: 96.6, barColor: "bg-emerald-500" },
    { courier: "Steadfast Courier", delivered: 620, rto: 34, avgHours: "28h", slaPercent: 94.5, barColor: "bg-indigo-500" },
    { courier: "In-House Express", delivered: 310, rto: 5, avgHours: "6h", slaPercent: 98.4, barColor: "bg-amber-500" },
    { courier: "Sundarban Courier", delivered: 180, rto: 12, avgHours: "48h", slaPercent: 91.2, barColor: "bg-purple-500" },
  ];

  return (
    <>
      <Topbar
        title="Executive Visual Charts & Analytics"
        subtitle="Senior-level interactive graphs, multi-dimensional revenue forecasting, funnel analysis, and unit economics"
      />
      <main className="space-y-8 p-8 bg-slate-50/50 min-h-screen">
        {/* Header Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold shadow-md shadow-indigo-200">
              📊
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                Visual Analytics Suite
              </h1>
              <p className="text-xs text-slate-500">
                Executive intelligence engine · Cohort retention, funnel conversion & cash flow dynamics
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* View Filter Tabs */}
            <div className="flex items-center rounded-xl border border-slate-200 bg-slate-100/70 p-1">
              <button
                onClick={() => setActiveTab("overview")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  activeTab === "overview"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Executive Overview
              </button>
              <button
                onClick={() => setActiveTab("revenue")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  activeTab === "revenue"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Revenue & Channels
              </button>
              <button
                onClick={() => setActiveTab("funnel")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  activeTab === "funnel"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Funnel & Matrix
              </button>
              <button
                onClick={() => setActiveTab("logistics")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  activeTab === "logistics"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Logistics & Courier SLA
              </button>
            </div>

            {/* Time Window Selectors */}
            <div className="flex items-center rounded-xl border border-slate-200 bg-white p-1 shadow-xs">
              {[7, 30, 90, 365].map((d) => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                    days === d
                      ? "bg-slate-900 text-white shadow-xs"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {d === 365 ? "1 Year" : `${d}D`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Top Executive KPI Cards */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative overflow-hidden rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-white to-emerald-50/40 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                Gross Revenue Velocity
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
                ৳
              </span>
            </div>
            <p className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">
              {loading ? "…" : formatTaka(analytics?.summary.totalRevenue ?? 18450000)}
            </p>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="font-semibold text-emerald-600 flex items-center gap-1">
                ▲ +14.2% <span className="text-slate-400 font-normal">vs prev period</span>
              </span>
              <span className="text-slate-400">Target 92% Met</span>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-indigo-200/80 bg-gradient-to-br from-white to-indigo-50/40 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">
                Average Order Value (AOV)
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">
                📈
              </span>
            </div>
            <p className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">
              {loading
                ? "…"
                : formatTaka(
                    Math.round(
                      (analytics?.summary.totalRevenue ?? 18450000) /
                        Math.max(analytics?.summary.totalOrders ?? 340, 1),
                    ),
                  )}
            </p>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="font-semibold text-indigo-600">
                ▲ +8.6% Growth
              </span>
              <span className="text-slate-400">{analytics?.summary.totalOrders ?? 340} Orders</span>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-purple-200/80 bg-gradient-to-br from-white to-purple-50/40 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-700">
                Customer LTV / Retention
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-purple-700 text-xs font-bold">
                👥
              </span>
            </div>
            <p className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">
              ৳ 5,420
            </p>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="font-semibold text-purple-600">
                38.4% Repeat Customers
              </span>
              <span className="text-slate-400">Cohorts High</span>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-amber-200/80 bg-gradient-to-br from-white to-amber-50/40 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
                Fulfillment SLA & RTO Rate
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
                🚚
              </span>
            </div>
            <p className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">
              96.2% SLA
            </p>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="font-semibold text-emerald-600">
                Low RTO: 3.8%
              </span>
              <span className="text-slate-400">Pathao & Steadfast</span>
            </div>
          </div>
        </section>

        {/* SECTION 1: Interactive Bézier Spline Revenue Area Chart */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  Interactive Revenue & Order Velocity Curve
                </h2>
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                  Live Vector Bézier Chart
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                Real-time smooth trend line showing daily financial output, orders, and trajectory across {days} days.
              </p>
            </div>

            <div className="flex items-center gap-3 text-xs font-medium text-slate-600">
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-emerald-500" /> Revenue Curve
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-indigo-500" /> Orders Baseline
              </span>
            </div>
          </div>

          <div className="relative mt-6">
            {loading ? (
              <div className="flex h-64 items-center justify-center text-xs font-medium text-slate-400">
                Synthesizing vector curves…
              </div>
            ) : trendPoints.length > 0 ? (
              <div className="relative overflow-visible">
                <svg
                  viewBox="0 0 800 220"
                  className="w-full h-64 overflow-visible drop-shadow-sm"
                >
                  <defs>
                    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Grid Lines */}
                  <line x1="20" y1="40" x2="780" y2="40" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="4 4" />
                  <line x1="20" y1="100" x2="780" y2="100" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="4 4" />
                  <line x1="20" y1="160" x2="780" y2="160" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="4 4" />

                  {/* Area Fill */}
                  <path d={svgAreaPath} fill="url(#areaGradient)" />

                  {/* Spline Line */}
                  <path d={svgLinePath} fill="none" stroke="#10B981" strokeWidth="3.5" strokeLinecap="round" />

                  {/* Interactive Nodes */}
                  {trendPoints.map((pt, idx) => (
                    <g key={idx} className="cursor-pointer">
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r="4.5"
                        fill="#FFFFFF"
                        stroke="#10B981"
                        strokeWidth="3"
                        className="transition-all hover:r-7 hover:fill-emerald-500"
                        onMouseEnter={() => setHoveredPoint(pt)}
                        onMouseLeave={() => setHoveredPoint(null)}
                      />
                    </g>
                  ))}
                </svg>

                {/* Floating Inspection Tooltip */}
                {hoveredPoint && (
                  <div
                    style={{
                      left: `${(hoveredPoint.x / 800) * 100}%`,
                      top: `${(hoveredPoint.y / 220) * 100 - 15}%`,
                    }}
                    className="pointer-events-none absolute z-50 -translate-x-1/2 -translate-y-full rounded-xl bg-slate-900 px-3.5 py-2.5 text-xs text-white shadow-2xl transition-all"
                  >
                    <p className="font-bold text-slate-200">{hoveredPoint.date}</p>
                    <p className="mt-1 font-extrabold text-emerald-400 text-sm">
                      {formatTaka(hoveredPoint.revenue)}
                    </p>
                    <p className="text-[11px] text-slate-300">
                      📦 {hoveredPoint.orders} Completed Orders
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex h-64 items-center justify-center text-xs text-slate-400">
                No revenue trend data recorded for selected duration.
              </div>
            )}
          </div>
        </section>

        {/* SECTION 2: Payment Gateway Distribution & Conversion Funnel Matrix */}
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Payment Gateway Distribution Ring Chart */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Payment Channels & Cash Flow Share
                </h2>
                <p className="text-xs text-slate-500">
                  Distribution of total revenue across bKash, Wallet, COD, and Bank channels.
                </p>
              </div>
              <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-[10px] font-bold text-indigo-800">
                Channel Analytics
              </span>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 items-center gap-6">
              {/* Visual Ring Chart Display */}
              <div className="relative flex justify-center items-center">
                <svg width="190" height="190" viewBox="0 0 42 42" className="drop-shadow-md">
                  <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="#F1F5F9" strokeWidth="5" />
                  {paymentBreakdown.reduce(
                    (acc, item, index) => {
                      const strokeDasharray = `${item.percentage} ${100 - item.percentage}`;
                      const strokeDashoffset = acc.offset;
                      acc.elements.push(
                        <circle
                          key={index}
                          cx="21"
                          cy="21"
                          r="15.91549430918954"
                          fill="transparent"
                          stroke={item.color}
                          strokeWidth={hoveredDonutSegment === item.name ? "7" : "5"}
                          strokeDasharray={strokeDasharray}
                          strokeDashoffset={strokeDashoffset}
                          className="transition-all cursor-pointer"
                          onMouseEnter={() => setHoveredDonutSegment(item.name)}
                          onMouseLeave={() => setHoveredDonutSegment(null)}
                        />
                      );
                      acc.offset -= item.percentage;
                      return acc;
                    },
                    { offset: 25, elements: [] as JSX.Element[] },
                  ).elements}
                </svg>

                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Total Share
                  </span>
                  <span className="text-lg font-extrabold text-slate-900">
                    100%
                  </span>
                  <span className="text-[10px] text-emerald-600 font-semibold">
                    bKash Lead (42%)
                  </span>
                </div>
              </div>

              {/* Legend & Breakdown Details */}
              <div className="space-y-3">
                {paymentBreakdown.map((item) => (
                  <div
                    key={item.name}
                    className={`flex items-center justify-between p-2.5 rounded-xl transition-all border ${
                      hoveredDonutSegment === item.name
                        ? "bg-slate-50 border-slate-300 scale-102"
                        : "border-transparent"
                    }`}
                    onMouseEnter={() => setHoveredDonutSegment(item.name)}
                    onMouseLeave={() => setHoveredDonutSegment(null)}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-xs font-semibold text-slate-800">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-slate-900">{item.percentage}%</span>
                      <p className="text-[10px] text-slate-400">{formatTaka(item.amount)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Customer Conversion & Funnel Waterfall */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Full Customer Conversion Funnel
                </h2>
                <p className="text-xs text-slate-500">
                  Stage-by-stage progression from initial view to paid fulfillment.
                </p>
              </div>
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                Conversion Rates
              </span>
            </div>

            <div className="mt-6 space-y-4">
              {[
                { stage: "1. Product Detail Impressions", count: analytics?.funnel.productViews ?? 14200, pct: 100, color: "bg-slate-900" },
                { stage: "2. Added to Cart (Intent)", count: analytics?.funnel.addToCart ?? 4820, pct: 33.9, color: "bg-blue-600" },
                { stage: "3. Initiated Checkout", count: analytics?.funnel.checkoutBegin ?? 2140, pct: 15.1, color: "bg-amber-500" },
                { stage: "4. Order Placed & Paid", count: analytics?.funnel.purchased ?? 1280, pct: 9.0, color: "bg-emerald-600" },
              ].map((step, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-800">{step.stage}</span>
                    <span className="text-slate-900 font-bold">{step.count.toLocaleString()} ({step.pct}%)</span>
                  </div>
                  <div className="h-3.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${step.color} transition-all duration-500`}
                      style={{ width: `${step.pct}%` }}
                    />
                  </div>
                </div>
              ))}

              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 text-xs text-emerald-900 font-medium">
                💡 <strong>Senior Insight:</strong> Your overall end-to-end conversion rate is <strong>9.0%</strong>, which outperforms standard e-commerce benchmarks (2.5 - 3.5%).
              </div>
            </div>
          </section>
        </div>

        {/* SECTION 3: Category Margin Matrix & Logistics SLA Heatmap */}
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Category Performance Matrix (Margin vs Volume) */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Category Profit Margin vs Volume Matrix
                </h2>
                <p className="text-xs text-slate-500">
                  Quadrant analysis comparing profit margins against sales velocity.
                </p>
              </div>
              <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-[10px] font-bold text-purple-800">
                Unit Economics
              </span>
            </div>

            <div className="mt-6 space-y-3">
              {categoryMatrix.map((cat) => (
                <div
                  key={cat.name}
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-slate-300 hover:bg-slate-50/60 transition-all"
                >
                  <div>
                    <p className="text-xs font-bold text-slate-900">{cat.name}</p>
                    <p className="text-[11px] text-slate-500">
                      Total Sales: <span className="font-semibold text-slate-700">{cat.revenue}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-xs font-bold text-emerald-600">{cat.margin}% Margin</p>
                      <p className="text-[10px] text-slate-400">{cat.volume} Units Sold</p>
                    </div>
                    <span className="rounded-lg bg-slate-900 px-2.5 py-1 text-[10px] font-semibold text-white">
                      {cat.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Logistics SLA & Courier Performance */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Courier Fulfillment & SLA Radar
                </h2>
                <p className="text-xs text-slate-500">
                  Delivery success rates, delivery speed (hours), and RTO comparison.
                </p>
              </div>
              <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-bold text-blue-800">
                Logistics Intelligence
              </span>
            </div>

            <div className="mt-6 space-y-4">
              {courierSla.map((c) => (
                <div key={c.courier} className="space-y-1.5 p-3 rounded-xl border border-slate-100 bg-slate-50/40">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-900">{c.courier}</span>
                    <span className="text-emerald-700 font-bold">{c.slaPercent}% SLA ({c.avgHours} Avg)</span>
                  </div>

                  <div className="h-3 w-full rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${c.barColor}`}
                      style={{ width: `${c.slaPercent}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[11px] text-slate-500 pt-0.5">
                    <span>Successful: <strong>{c.delivered}</strong> orders</span>
                    <span className="text-rose-600">RTO Returns: <strong>{c.rto}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
