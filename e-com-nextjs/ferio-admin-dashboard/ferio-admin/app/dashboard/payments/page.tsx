"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Topbar from "@/components/Topbar";
import type {
  PaymentAttempt,
  PaymentAttemptDetail,
  PaymentAttemptPage,
  PaymentProviderReadiness,
  PaymentRecoveryHealth,
  PaymentRecoverySweepResult,
} from "@/lib/payments";

const emptyPage: PaymentAttemptPage = {
  items: [],
  page: 1,
  limit: 30,
  total: 0,
  totalPages: 1,
};

const supportedProviders: PaymentProviderReadiness[] = [
  { code: "SSLCOMMERZ", name: "SSLCommerz", configured: false },
  { code: "AAMARPAY", name: "aamarPay", configured: false },
];

function formatMoney(amount: number, currency = "BDT") {
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount / 100);
}

function statusClass(status: string) {
  if (["SUCCEEDED", "PAID", "REFUNDED", "VALIDATED"].includes(status))
    return "bg-emerald-50 text-emerald-700";
  if (
    ["FAILED", "CANCELLED", "EXPIRED", "UNKNOWN", "REJECTED"].includes(status)
  )
    return "bg-rose-50 text-rose-700";
  if (["PENDING", "PARTIAL", "PARTIALLY_REFUNDED"].includes(status))
    return "bg-amber-50 text-amber-700";
  return "bg-surface text-ink2";
}

function formatEnum(value: string) {
  const label = value.replaceAll("_", " ").toLowerCase();
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function Status({ value }: { value: string }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[11px] ${statusClass(value)}`}
    >
      {formatEnum(value)}
    </span>
  );
}

export default function PaymentsPage() {
  const searchParams = useSearchParams();
  const initialFilters = {
    search: searchParams.get("search") || "",
    provider: searchParams.get("provider") || "",
    status: searchParams.get("status") || "",
    paymentStatus: searchParams.get("paymentStatus") || "",
    refundStatus: searchParams.get("refundStatus") || "",
  };
  const [ledger, setLedger] = useState<PaymentAttemptPage>(emptyPage);
  const [providers, setProviders] = useState<PaymentProviderReadiness[]>([]);
  const [health, setHealth] = useState<PaymentRecoveryHealth | null>(null);
  const [filters, setFilters] = useState(initialFilters);
  const [search, setSearch] = useState(initialFilters.search);
  const [provider, setProvider] = useState(initialFilters.provider);
  const [status, setStatus] = useState(initialFilters.status);
  const [paymentStatus, setPaymentStatus] = useState(
    initialFilters.paymentStatus,
  );
  const [refundStatus, setRefundStatus] = useState(initialFilters.refundStatus);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [operationalLoading, setOperationalLoading] = useState(true);
  const [sweeping, setSweeping] = useState(false);
  const [detail, setDetail] = useState<PaymentAttemptDetail | null>(null);
  const [detailLoadingId, setDetailLoadingId] = useState<string | null>(null);
  const [ledgerError, setLedgerError] = useState("");
  const [actionError, setActionError] = useState("");
  const [operationalError, setOperationalError] = useState("");
  const [notice, setNotice] = useState("");

  const loadLedger = useCallback(async () => {
    setLoading(true);
    setLedgerError("");
    try {
      const query = new URLSearchParams({ page: String(page), limit: "30" });
      if (filters.search.trim()) query.set("search", filters.search.trim());
      if (filters.provider) query.set("provider", filters.provider);
      if (filters.status) query.set("status", filters.status);
      if (filters.paymentStatus)
        query.set("paymentStatus", filters.paymentStatus);
      if (filters.refundStatus) query.set("refundStatus", filters.refundStatus);
      const response = await fetch(`/api/payments/attempts?${query}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        data?: PaymentAttemptPage;
        message?: string;
      };
      if (!response.ok || !payload.data)
        throw new Error(payload.message || "Unable to load payments.");
      setLedger(payload.data);
    } catch (loadError) {
      setLedgerError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load payments.",
      );
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    void loadLedger();
  }, [loadLedger]);
  const loadOperationalState = useCallback(async () => {
    setOperationalLoading(true);
    setOperationalError("");
    try {
      const [providerResponse, healthResponse] = await Promise.all([
        fetch("/api/payments/providers", { cache: "no-store" }),
        fetch("/api/payments/recovery/queue-health", { cache: "no-store" }),
      ]);
      const providerPayload = (await providerResponse.json()) as {
        data?: PaymentProviderReadiness[];
        message?: string;
      };
      const healthPayload = (await healthResponse.json()) as {
        data?: PaymentRecoveryHealth;
        message?: string;
      };
      const failures: string[] = [];
      if (providerResponse.ok && providerPayload.data) {
        setProviders(providerPayload.data);
      } else {
        failures.push(
          providerPayload.message || "Unable to load provider readiness.",
        );
      }
      if (healthResponse.ok && healthPayload.data) {
        setHealth(healthPayload.data);
      } else {
        failures.push(
          healthPayload.message || "Unable to load recovery queue health.",
        );
      }
      setOperationalError(failures.join(" "));
    } catch (loadError) {
      setOperationalError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load payment operations.",
      );
    } finally {
      setOperationalLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOperationalState();
  }, [loadOperationalState]);

  async function loadDetail(attempt: PaymentAttempt) {
    setDetailLoadingId(attempt.id);
    setActionError("");
    try {
      const response = await fetch(`/api/payments/attempts/${attempt.id}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        data?: PaymentAttemptDetail;
        message?: string;
      };
      if (!response.ok || !payload.data)
        throw new Error(payload.message || "Unable to load payment evidence.");
      setDetail(payload.data);
      window.requestAnimationFrame(() => {
        const evidence = document.getElementById("payment-evidence");
        evidence?.scrollIntoView({ block: "start" });
        evidence?.focus({ preventScroll: true });
      });
    } catch (detailError) {
      setActionError(
        detailError instanceof Error
          ? detailError.message
          : "Unable to load payment evidence.",
      );
    } finally {
      setDetailLoadingId(null);
    }
  }

  async function sweep() {
    setSweeping(true);
    setActionError("");
    setNotice("");
    try {
      const response = await fetch("/api/payments/recovery/sweep", {
        method: "POST",
      });
      const payload = (await response.json()) as {
        data?: PaymentRecoverySweepResult;
        message?: string;
      };
      if (!response.ok)
        throw new Error(payload.message || "Unable to queue recovery sweep.");
      setNotice("Payment recovery sweep queued.");
      await loadOperationalState();
    } catch (sweepError) {
      setActionError(
        sweepError instanceof Error
          ? sweepError.message
          : "Unable to queue recovery sweep.",
      );
    } finally {
      setSweeping(false);
    }
  }

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDetail(null);
    setPage(1);
    setFilters({ search, provider, status, paymentStatus, refundStatus });
  }

  function clearFilters() {
    setSearch("");
    setProvider("");
    setStatus("");
    setPaymentStatus("");
    setRefundStatus("");
    setFilters({
      search: "",
      provider: "",
      status: "",
      paymentStatus: "",
      refundStatus: "",
    });
    setDetail(null);
    setPage(1);
  }

  const controlClass =
    "rounded-card border border-line bg-paper px-3.5 py-2 text-[12px] text-ink focus-visible:border-ink focus-visible:outline-none";
  const attemptStatuses = [
    "CREATED",
    "INITIATING",
    "PENDING",
    "SUCCEEDED",
    "FAILED",
    "CANCELLED",
    "EXPIRED",
    "UNKNOWN",
  ];
  const paymentStatuses = [
    "UNPAID",
    "PAID",
    "FAILED",
    "PARTIALLY_REFUNDED",
    "REFUNDED",
  ];
  const refundStatuses = ["NONE", "PENDING", "PARTIAL", "REFUNDED", "FAILED"];

  return (
    <>
      <Topbar
        title="Payments"
        subtitle={`${ledger.total} prepaid attempt${ledger.total === 1 ? "" : "s"}`}
      />
      <main className="space-y-7 p-4 sm:p-8">
        <section aria-labelledby="provider-readiness-title">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-3">
            <div>
              <h2
                id="provider-readiness-title"
                className="text-[15px] font-medium text-ink"
              >
                Provider readiness
              </h2>
              <p className="mt-1 text-[12px] text-ink2">
                Hosted prepaid gateways available to checkout.
              </p>
            </div>
            {operationalLoading && (
              <span className="text-[12px] text-ink2">Checking…</span>
            )}
          </div>
          <div className="grid divide-y divide-line sm:grid-cols-2 sm:divide-x sm:divide-y-0">
            {providers.map((item) => (
              <div
                key={item.code}
                className="flex items-center justify-between gap-4 px-1 py-5 sm:px-5"
              >
                <div>
                  <p className="text-[13px] font-medium text-ink">
                    {item.name}
                  </p>
                  <p className="mt-1 text-[11px] text-ink2">{item.code}</p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] ${
                    item.configured
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {item.configured ? "Configured" : "Credentials missing"}
                </span>
              </div>
            ))}
            {!operationalLoading && providers.length === 0 && (
              <p className="py-8 text-[12px] text-ink2">
                Provider readiness is unavailable.
              </p>
            )}
          </div>
        </section>

        <section className="flex flex-wrap items-center justify-between gap-5 border-y border-line py-5">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-[15px] font-medium text-ink">
                Expiry recovery
              </h2>
              {!operationalLoading && health && (
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] ${
                    health.available
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-rose-50 text-rose-700"
                  }`}
                >
                  {health.available ? "Queue available" : "Queue unavailable"}
                </span>
              )}
            </div>
            <p className="mt-2 text-[13px] text-ink">
              {operationalLoading
                ? "Checking recovery state…"
                : `${health?.eligibleCount ?? 0} expired attempt${health?.eligibleCount === 1 ? "" : "s"} due`}
            </p>
            <p className="mt-1 text-[12px] text-ink2">
              {operationalLoading
                ? "Loading scheduler configuration…"
                : health?.enabled
                  ? `Automatic sweep every ${health.everyMinutes} minutes`
                  : "Automatic recovery disabled by deployment configuration"}
            </p>
            {health?.counts && (
              <p className="mt-2 text-[11px] text-ink2">
                Waiting {health.counts.waiting ?? 0} · Active{" "}
                {health.counts.active ?? 0} · Failed {health.counts.failed ?? 0}
              </p>
            )}
            {health?.error && (
              <p role="status" className="mt-2 text-[11px] text-rose-700">
                {health.error}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => void sweep()}
            disabled={sweeping || operationalLoading || !health?.available}
            className="rounded-full border border-line px-4 py-2 text-[12px] text-ink disabled:opacity-40"
          >
            {sweeping ? "Queueing…" : "Run recovery sweep"}
          </button>
        </section>

        {operationalError && (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-rose-200 bg-rose-50 p-4 text-[13px] text-rose-700"
          >
            <span>{operationalError}</span>
            <button
              type="button"
              onClick={() => void loadOperationalState()}
              className="rounded-full border border-rose-200 px-3 py-1.5 text-[12px] font-medium"
            >
              Retry readiness check
            </button>
          </div>
        )}
        {notice && (
          <div
            role="status"
            className="rounded-card border border-emerald-200 bg-emerald-50 p-4 text-[13px] text-emerald-700"
          >
            {notice}
          </div>
        )}
        {actionError && (
          <div
            role="alert"
            className="rounded-card border border-rose-200 bg-rose-50 p-4 text-[13px] text-rose-700"
          >
            {actionError}
          </div>
        )}

        <form
          onSubmit={applyFilters}
          className="flex flex-wrap items-end gap-3 border-b border-line pb-6"
        >
          <label className="grid min-w-52 flex-1 gap-1.5 text-[10px] uppercase tracking-eyebrow text-ink2">
            Search
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Order or transaction reference"
              className={controlClass}
            />
          </label>
          <label className="grid gap-1.5 text-[10px] uppercase tracking-eyebrow text-ink2">
            Provider
            <select
              value={provider}
              onChange={(event) => setProvider(event.target.value)}
              className={controlClass}
            >
              <option value="">All</option>
              {supportedProviders.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-[10px] uppercase tracking-eyebrow text-ink2">
            Attempt
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className={controlClass}
            >
              <option value="">All</option>
              {attemptStatuses.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-[10px] uppercase tracking-eyebrow text-ink2">
            Payment
            <select
              value={paymentStatus}
              onChange={(event) => setPaymentStatus(event.target.value)}
              className={controlClass}
            >
              <option value="">All</option>
              {paymentStatuses.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-[10px] uppercase tracking-eyebrow text-ink2">
            Refund
            <select
              value={refundStatus}
              onChange={(event) => setRefundStatus(event.target.value)}
              className={controlClass}
            >
              <option value="">All</option>
              {refundStatuses.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <button
            disabled={loading}
            className="rounded-full bg-ink px-5 py-2.5 text-[12px] text-white disabled:opacity-40"
          >
            {loading ? "Loading…" : "Apply"}
          </button>
          <button
            type="button"
            onClick={clearFilters}
            className="px-2 py-2 text-[12px] text-ink2 underline decoration-line underline-offset-4"
          >
            Clear
          </button>
        </form>

        {ledgerError && (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-rose-200 bg-rose-50 p-4 text-[13px] text-rose-700"
          >
            <span>{ledgerError}</span>
            <button
              type="button"
              onClick={() => void loadLedger()}
              className="rounded-full border border-rose-200 px-3 py-1.5 text-[12px] font-medium"
            >
              Retry payments
            </button>
          </div>
        )}
        <div
          className="overflow-x-auto border-y border-line"
          aria-busy={loading}
        >
          <table className="w-full min-w-[1120px] border-collapse text-left">
            <thead>
              <tr className="border-b border-line text-[11px] uppercase tracking-eyebrow text-ink2">
                <th scope="col" className="px-5 py-3 font-normal">
                  Order
                </th>
                <th scope="col" className="px-5 py-3 font-normal">
                  Provider
                </th>
                <th scope="col" className="px-5 py-3 font-normal">
                  Merchant transaction
                </th>
                <th scope="col" className="px-5 py-3 font-normal">
                  Amount
                </th>
                <th scope="col" className="px-5 py-3 font-normal">
                  Payment
                </th>
                <th scope="col" className="px-5 py-3 font-normal">
                  Refund
                </th>
                <th scope="col" className="px-5 py-3 font-normal">
                  Created
                </th>
                <th scope="col" className="px-5 py-3 font-normal">
                  Attempt
                </th>
                <th scope="col" className="px-5 py-3 font-normal">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {ledger.items.map((attempt) => (
                <tr key={attempt.id} className="text-[13px]">
                  <td className="px-5 py-3.5 font-medium text-ink">
                    <Link
                      href={`/dashboard/orders/${attempt.order.id}`}
                      className="underline decoration-line underline-offset-4 hover:decoration-ink"
                    >
                      {attempt.order.reference}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 text-ink2">
                    {attempt.provider === "AAMARPAY"
                      ? "aamarPay"
                      : "SSLCommerz"}
                  </td>
                  <td className="px-5 py-3.5 text-ink2">
                    {attempt.merchantTransactionId}
                  </td>
                  <td className="px-5 py-3.5 text-ink2">
                    {formatMoney(attempt.amount, attempt.currency)}
                  </td>
                  <td className="px-5 py-3.5">
                    <Status value={attempt.order.paymentStatus} />
                  </td>
                  <td className="px-5 py-3.5">
                    <Status value={attempt.order.refundStatus} />
                  </td>
                  <td className="px-5 py-3.5 text-ink2">
                    {new Date(attempt.createdAt).toLocaleString("en-BD")}
                  </td>
                  <td className="px-5 py-3.5">
                    <Status value={attempt.status} />
                    {attempt.failureMessage && (
                      <p className="mt-1 max-w-56 text-[11px] text-rose-700">
                        {attempt.failureMessage}
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <button
                      onClick={() => void loadDetail(attempt)}
                      disabled={detailLoadingId !== null}
                      aria-controls="payment-evidence"
                      aria-expanded={detail?.id === attempt.id}
                      className="text-[12px] text-ink underline decoration-line underline-offset-4 disabled:text-ink2"
                    >
                      {detailLoadingId === attempt.id
                        ? "Loading…"
                        : "View evidence"}
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && ledger.items.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-5 py-14 text-center text-[13px] text-ink2"
                  >
                    No payment attempts match these filters.
                  </td>
                </tr>
              )}
              {loading && ledger.items.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-5 py-14 text-center text-[13px] text-ink2"
                  >
                    Loading payment attempts…
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between text-[12px] text-ink2">
          <span>
            Page {ledger.page} of {ledger.totalPages}
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1 || loading}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              className="rounded-full border border-line px-4 py-2 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              disabled={page >= ledger.totalPages || loading}
              onClick={() => setPage((value) => value + 1)}
              className="rounded-full border border-line px-4 py-2 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>

        {detail && (
          <section
            id="payment-evidence"
            tabIndex={-1}
            aria-labelledby="payment-evidence-title"
            className="scroll-mt-6 border-t border-line pt-8"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-eyebrow text-ink2">
                  Payment evidence
                </p>
                <h2
                  id="payment-evidence-title"
                  className="mt-1 text-[18px] font-medium text-ink"
                >
                  {detail.order.reference} · {detail.merchantTransactionId}
                </h2>
                <p className="mt-1 text-[12px] text-ink2">
                  Raw gateway payloads and initiation secrets are intentionally
                  excluded.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetail(null)}
                className="text-[12px] text-ink2 underline decoration-line underline-offset-4"
              >
                Close
              </button>
            </div>
            <dl className="mt-6 grid gap-5 border-y border-line py-5 text-[12px] sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <dt className="text-ink2">Attempt</dt>
                <dd className="mt-1">
                  <Status value={detail.status} />
                </dd>
              </div>
              <div>
                <dt className="text-ink2">Provider</dt>
                <dd className="mt-1 text-ink">
                  {detail.provider === "AAMARPAY" ? "aamarPay" : "SSLCommerz"}
                </dd>
              </div>
              <div>
                <dt className="text-ink2">Amount</dt>
                <dd className="mt-1 text-ink">
                  {formatMoney(detail.amount, detail.currency)}
                </dd>
              </div>
              <div>
                <dt className="text-ink2">Payment</dt>
                <dd className="mt-1">
                  <Status value={detail.order.paymentStatus} />
                </dd>
              </div>
              <div>
                <dt className="text-ink2">Refund</dt>
                <dd className="mt-1">
                  <Status value={detail.order.refundStatus} />
                </dd>
              </div>
              <div>
                <dt className="text-ink2">Provider transaction</dt>
                <dd className="mt-1 break-all text-ink">
                  {detail.providerTransactionId || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-ink2">Provider session</dt>
                <dd className="mt-1 break-all text-ink">
                  {detail.providerSessionId || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-ink2">Validation reference</dt>
                <dd className="mt-1 break-all text-ink">
                  {detail.providerValidationId || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-ink2">Initiated</dt>
                <dd className="mt-1 text-ink">
                  {detail.initiatedAt
                    ? new Date(detail.initiatedAt).toLocaleString("en-BD")
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-ink2">Completed</dt>
                <dd className="mt-1 text-ink">
                  {detail.completedAt
                    ? new Date(detail.completedAt).toLocaleString("en-BD")
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-ink2">Expires</dt>
                <dd className="mt-1 text-ink">
                  {detail.expiresAt
                    ? new Date(detail.expiresAt).toLocaleString("en-BD")
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-ink2">Failure code</dt>
                <dd className="mt-1 text-ink">{detail.failureCode || "—"}</dd>
              </div>
            </dl>
            {detail.failureMessage && (
              <p
                role="status"
                className="mt-4 rounded-card border border-rose-200 bg-rose-50 p-4 text-[12px] text-rose-700"
              >
                {detail.failureMessage}
              </p>
            )}
            <div className="mt-7 grid gap-8 lg:grid-cols-2">
              <div>
                <h3 className="text-[15px] font-medium text-ink">Callbacks</h3>
                <div className="mt-3 divide-y divide-line border-y border-line">
                  {detail.callbacks.map((callback) => (
                    <div
                      key={callback.id}
                      className="flex items-start justify-between gap-4 py-3 text-[12px]"
                    >
                      <div>
                        <p className="text-ink">
                          {formatEnum(callback.eventType)}
                        </p>
                        <p className="mt-1 text-[11px] text-ink2">
                          {new Date(callback.createdAt).toLocaleString("en-BD")}
                          {callback.processedAt
                            ? ` · Processed ${new Date(callback.processedAt).toLocaleString("en-BD")}`
                            : ""}
                          {callback.errorMessage
                            ? ` · ${callback.errorMessage}`
                            : ""}
                        </p>
                      </div>
                      <Status value={callback.status} />
                    </div>
                  ))}
                  {!detail.callbacks.length && (
                    <p className="py-5 text-[12px] text-ink2">
                      No callback evidence.
                    </p>
                  )}
                </div>
              </div>
              <div>
                <h3 className="text-[15px] font-medium text-ink">
                  Refund ledger
                </h3>
                <div className="mt-3 divide-y divide-line border-y border-line">
                  {detail.order.refunds.map((refund) => (
                    <div key={refund.id} className="py-3 text-[12px]">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-ink">
                            {refund.reference} ·{" "}
                            {formatMoney(refund.amount, refund.currency)}
                          </p>
                          <p className="mt-1 text-[11px] text-ink2">
                            {formatEnum(refund.method)}
                            {refund.provider ? ` · ${refund.provider}` : ""}
                          </p>
                        </div>
                        <Status value={refund.status} />
                      </div>
                      {refund.failureReason && (
                        <p className="mt-2 text-[11px] text-rose-700">
                          {refund.failureReason}
                        </p>
                      )}
                    </div>
                  ))}
                  {!detail.order.refunds.length && (
                    <p className="py-5 text-[12px] text-ink2">
                      No refund records for this order.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
    </>
  );
}
