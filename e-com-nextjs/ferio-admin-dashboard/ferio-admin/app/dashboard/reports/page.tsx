"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import Topbar from "@/components/Topbar";
import { formatTaka } from "@/lib/catalog";
import type { ReportCount, ReportsOverview } from "@/lib/reports";

function dateDaysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

function CountRows({ rows, empty }: { rows: ReportCount[]; empty: string }) {
  if (!rows.length) return <p className="text-[12px] text-ink2">{empty}</p>;
  return (
    <div className="divide-y divide-line">
      {rows.map((row) => (
        <div
          key={row.value}
          className="flex justify-between py-2.5 text-[12px]"
        >
          <span className="text-ink2">{row.value.replaceAll("_", " ")}</span>
          <span className="font-medium text-ink">{row.count}</span>
        </div>
      ))}
    </div>
  );
}

export default function ReportsPage() {
  const [dateFrom, setDateFrom] = useState(dateDaysAgo(29));
  const [dateTo, setDateTo] = useState(dateDaysAgo(0));
  const [source, setSource] = useState("");
  const [provider, setProvider] = useState("");
  const [report, setReport] = useState<ReportsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams({ dateFrom, dateTo });
      if (source.trim()) query.set("source", source.trim());
      if (provider) query.set("provider", provider);
      const response = await fetch(`/api/reports/overview?${query}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        data?: ReportsOverview;
        message?: string;
      };
      if (!response.ok || !payload.data) {
        throw new Error(payload.message || "Unable to load reports.");
      }
      setReport(payload.data);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load reports.",
      );
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, provider, source]);

  useEffect(() => {
    void load();
  }, []);

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void load();
  }

  const inputClass =
    "rounded-card border border-line px-3.5 py-2 text-[13px] text-ink outline-none focus:border-ink";
  const outcomeLinks: Array<[keyof ReportsOverview["outcomes"], string]> = [
    ["placed", "Placed"],
    ["confirmed", "Confirmed"],
    ["shipped", "Shipped"],
    ["delivered", "Delivered"],
    ["cancelled", "Cancelled"],
    ["returned", "Returned"],
    ["rto", "RTO"],
  ];

  return (
    <>
      <Topbar
        title="Reports"
        subtitle="Order outcomes, revenue basis, and operational exceptions"
      />
      <main className="space-y-8 p-8">
        <form
          onSubmit={applyFilters}
          className="flex flex-wrap items-end gap-3 border-b border-line pb-6"
        >
          <label className="grid gap-1.5 text-[11px] uppercase tracking-eyebrow text-ink2">
            From
            <input
              required
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              className={inputClass}
            />
          </label>
          <label className="grid gap-1.5 text-[11px] uppercase tracking-eyebrow text-ink2">
            To
            <input
              required
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              className={inputClass}
            />
          </label>
          <label className="grid gap-1.5 text-[11px] uppercase tracking-eyebrow text-ink2">
            Source
            <input
              value={source}
              onChange={(event) => setSource(event.target.value)}
              placeholder="All sources"
              className={inputClass}
            />
          </label>
          <label className="grid gap-1.5 text-[11px] uppercase tracking-eyebrow text-ink2">
            Courier
            <select
              value={provider}
              onChange={(event) => setProvider(event.target.value)}
              className={inputClass}
            >
              <option value="">All couriers</option>
              <option value="PATHAO">Pathao</option>
              <option value="STEADFAST">Steadfast</option>
            </select>
          </label>
          <button
            disabled={loading}
            className="rounded-full bg-ink px-5 py-2.5 text-[13px] font-medium text-white disabled:opacity-50"
          >
            {loading ? "Loading…" : "Apply"}
          </button>
        </form>

        {error && (
          <p role="alert" className="text-[12px] text-rose-700">
            {error}
          </p>
        )}
        {report && (
          <>
            <section>
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-[17px] font-medium text-ink">
                    Order outcomes
                  </h2>
                  <p className="mt-1 max-w-3xl text-[12px] leading-5 text-ink2">
                    {report.basis.description}
                  </p>
                </div>
                <span className="text-[11px] uppercase tracking-eyebrow text-ink2">
                  {report.basis.dateFrom} — {report.basis.dateTo} · UTC
                </span>
              </div>
              <div className="grid border-y border-line sm:grid-cols-2 lg:grid-cols-7">
                {outcomeLinks.map(([key, label]) => (
                  <Link
                    key={key}
                    href="/dashboard/orders"
                    className="border-b border-line px-4 py-5 transition hover:bg-surface sm:border-r lg:border-b-0"
                  >
                    <p className="text-[11px] uppercase tracking-eyebrow text-ink2">
                      {label}
                    </p>
                    <p className="mt-2 text-[25px] font-semibold tracking-tight text-ink">
                      {report.outcomes[key]}
                    </p>
                  </Link>
                ))}
              </div>
              {report.outcomes.returnCases > report.outcomes.returned && (
                <p className="mt-3 text-[11px] text-ink2">
                  {report.outcomes.returnCases} customer return cases exist
                  across requested, approved, rejected, and received states;
                  only received cases are shown as returned.
                </p>
              )}
            </section>

            <section className="grid gap-8 xl:grid-cols-[1.3fr_1fr]">
              <div>
                <h2 className="text-[17px] font-medium text-ink">
                  Revenue basis
                </h2>
                <p className="mt-1 text-[12px] text-ink2">
                  Amounts are not interchangeable. Each row uses the definition
                  shown.
                </p>
                <div className="mt-4 divide-y divide-line border-y border-line">
                  {(
                    [
                      ["grossPlaced", "Gross placed"],
                      ["grossConfirmed", "Gross confirmed"],
                      ["grossDelivered", "Gross delivered"],
                      ["knownCollected", "Known collected"],
                    ] as const
                  ).map(([key, label]) => (
                    <div
                      key={key}
                      className="grid gap-2 py-4 sm:grid-cols-[150px_140px_1fr] sm:items-center"
                    >
                      <span className="text-[12px] text-ink2">{label}</span>
                      <span className="text-[16px] font-medium text-ink">
                        {formatTaka(report.revenue[key])}
                      </span>
                      <span className="text-[11px] leading-5 text-ink2">
                        {report.revenue.definitions[key]}
                      </span>
                    </div>
                  ))}
                  <div className="grid gap-2 py-4 sm:grid-cols-[150px_140px_1fr] sm:items-center">
                    <span className="text-[12px] text-ink2">Net of refund</span>
                    <span className="text-[16px] font-medium text-ink">
                      {formatTaka(report.revenue.netOfRefund)}
                    </span>
                    <span className="text-[11px] leading-5 text-ink2">
                      {report.revenue.definitions.netOfRefund}
                    </span>
                  </div>
                </div>
              </div>
              <div className="border-l-0 border-line xl:border-l xl:pl-8">
                <h2 className="text-[17px] font-medium text-ink">
                  Contribution status
                </h2>
                <span className="mt-4 inline-flex rounded-full bg-amber-50 px-3 py-1 text-[11px] text-amber-700">
                  Incomplete inputs
                </span>
                <p className="mt-4 text-[14px] text-ink">
                  No profit or contribution value is shown.
                </p>
                <p className="mt-1 text-[12px] leading-5 text-ink2">
                  Required inputs still missing:
                </p>
                <ul className="mt-3 space-y-1.5 text-[12px] text-ink2">
                  {report.contribution.missingInputs.map((input) => (
                    <li key={input}>— {input}</li>
                  ))}
                </ul>
              </div>
            </section>

            <section className="grid gap-8 border-t border-line pt-8 lg:grid-cols-3">
              <div>
                <h2 className="mb-4 text-[15px] font-medium text-ink">
                  Operations
                </h2>
                <div className="divide-y divide-line text-[12px]">
                  {Object.entries(report.operations).map(([key, value]) => (
                    <div key={key} className="flex justify-between py-2.5">
                      <span className="text-ink2">
                        {key.replace(/([A-Z])/g, " $1").toLowerCase()}
                      </span>
                      <span className="font-medium text-ink">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h2 className="mb-4 text-[15px] font-medium text-ink">
                  Payment and costs
                </h2>
                <CountRows
                  rows={report.finance.paymentStatus}
                  empty="No payment states in this cohort."
                />
                <div className="mt-4 space-y-1 text-[11px] leading-5 text-ink2">
                  <p>
                    COD expected: {formatTaka(report.finance.codExpectedAmount)}{" "}
                    · settled: {formatTaka(report.finance.codSettlementAmount)}
                  </p>
                  <p>
                    COD collection variance:{" "}
                    {formatTaka(report.finance.codCollectionVariance)} ·{" "}
                    {report.finance.unresolvedCodCollections} unresolved
                  </p>
                  <p>
                    Succeeded refunds: {formatTaka(report.finance.refundAmount)}{" "}
                    · RTO cost: {formatTaka(report.finance.rtoCost)}
                  </p>
                </div>
              </div>
              <div>
                <h2 className="mb-4 text-[15px] font-medium text-ink">
                  Dimensions
                </h2>
                <p className="mb-2 text-[11px] uppercase tracking-eyebrow text-ink2">
                  Sources
                </p>
                <CountRows
                  rows={report.dimensions.sources}
                  empty="No source data."
                />
                <p className="mb-2 mt-5 text-[11px] uppercase tracking-eyebrow text-ink2">
                  Couriers
                </p>
                <CountRows
                  rows={report.dimensions.providers}
                  empty="No courier data."
                />
              </div>
            </section>
          </>
        )}
      </main>
    </>
  );
}
