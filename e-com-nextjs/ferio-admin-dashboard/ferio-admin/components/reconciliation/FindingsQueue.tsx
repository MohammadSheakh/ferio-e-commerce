"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import Pagination from "@/components/Pagination";
import { createBrowserUuid } from "@/lib/browser-uuid";
import type {
  ReconciliationFinding,
  ReconciliationFindingPage,
  ReconciliationQueueHealth,
  ReconciliationRun,
} from "@/lib/settlements";

const severityClass: Record<ReconciliationFinding["severity"], string> = {
  LOW: "bg-surface text-ink2",
  MEDIUM: "bg-surface text-ink2",
  HIGH: "bg-amber-50 text-amber-700",
  CRITICAL: "bg-rose-50 text-rose-700",
};

const fieldClass =
  "rounded-card border border-line bg-paper px-3 py-2 text-[11px] text-ink focus-visible:border-ink focus-visible:outline-none";

function formatEnum(value: string) {
  const label = value.replaceAll("_", " ").toLowerCase();
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function failureMessage(reason: unknown, fallback: string) {
  return reason instanceof Error ? reason.message : fallback;
}

function ageLabel(value: string) {
  const hours = Math.max(
    0,
    Math.floor((Date.now() - new Date(value).getTime()) / 3600000),
  );
  return hours < 24 ? `${hours}h` : `${Math.floor(hours / 24)}d`;
}

function entityHref(entry: ReconciliationFinding) {
  const orderId =
    typeof entry.context.orderId === "string" ? entry.context.orderId : null;
  if (entry.entityType === "Order")
    return `/dashboard/orders/${entry.entityId}`;
  if (orderId) return `/dashboard/orders/${orderId}`;
  return null;
}

function ActionForm({
  entry,
  reload,
}: {
  entry: ReconciliationFinding;
  reload: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(
        `/api/reconciliation/findings/${entry.id}/action`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: form.get("action"),
            note: form.get("note"),
          }),
        },
      );
      const payload = (await response.json()) as {
        data?: ReconciliationFinding;
        message?: string;
      };
      if (!response.ok || !payload.data)
        throw new Error(payload.message || "Unable to update finding.");
      setNotice(`${formatEnum(String(form.get("action")))} recorded.`);
      reload();
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Unable to update finding.",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <form
      onSubmit={submit}
      className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3"
    >
      <select
        name="action"
        aria-label={`Action for ${entry.title}`}
        className={fieldClass}
      >
        {entry.status !== "RESOLVED" && <option value="CLAIM">Claim</option>}
        {entry.status !== "RESOLVED" && (
          <option value="ACKNOWLEDGE">Acknowledge</option>
        )}
        {entry.status !== "RESOLVED" ? (
          <option value="RESOLVE">Resolve</option>
        ) : (
          <option value="REOPEN">Reopen</option>
        )}
      </select>
      <input
        required
        name="note"
        minLength={3}
        maxLength={1000}
        placeholder="Required action note"
        aria-label={`Action note for ${entry.title}`}
        className={`min-w-64 flex-1 ${fieldClass}`}
      />
      <button
        disabled={saving}
        className="rounded-full bg-ink px-4 py-2 text-[11px] text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-40"
      >
        {saving ? "Saving…" : "Apply action"}
      </button>
      {error && (
        <p role="alert" className="w-full text-[11px] text-rose-700">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="w-full text-[11px] text-emerald-700">
          {notice}
        </p>
      )}
    </form>
  );
}

export default function FindingsQueue() {
  const [page, setPage] = useState<ReconciliationFindingPage | null>(null);
  const [status, setStatus] = useState("OPEN");
  const [domain, setDomain] = useState("");
  const [severity, setSeverity] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 30;
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [operationError, setOperationError] = useState("");
  const [lastRun, setLastRun] = useState<ReconciliationRun | null>(null);
  const [queueHealth, setQueueHealth] =
    useState<ReconciliationQueueHealth | null>(null);
  const [retrying, setRetrying] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    const query = new URLSearchParams({
      limit: String(pageSize),
      page: String(currentPage),
    });
    if (status) query.set("status", status);
    if (domain) query.set("domain", domain);
    if (severity) query.set("severity", severity);
    const [findingsResult, healthResult] = await Promise.allSettled([
      (async () => {
        const response = await fetch(`/api/reconciliation/findings?${query}`, {
          cache: "no-store",
        });
        const payload = (await response.json()) as {
          data?: ReconciliationFindingPage;
          message?: string;
        };
        if (!response.ok || !payload.data)
          throw new Error(payload.message || "Unable to load findings.");
        return payload.data;
      })(),
      (async () => {
        const response = await fetch("/api/reconciliation/queue-health", {
          cache: "no-store",
        });
        const payload = (await response.json()) as {
          data?: ReconciliationQueueHealth;
          message?: string;
        };
        if (!response.ok || !payload.data)
          throw new Error(payload.message || "Unable to load queue health.");
        return payload.data;
      })(),
    ]);
    const failures: string[] = [];
    if (findingsResult.status === "fulfilled") {
      setPage(findingsResult.value);
      if (
        findingsResult.value.totalPages > 0 &&
        currentPage > findingsResult.value.totalPages
      ) {
        setCurrentPage(findingsResult.value.totalPages);
      }
    } else {
      failures.push(
        failureMessage(findingsResult.reason, "Unable to load findings."),
      );
    }
    if (healthResult.status === "fulfilled") {
      setQueueHealth(healthResult.value);
    } else {
      failures.push(
        failureMessage(healthResult.reason, "Unable to load queue health."),
      );
    }
    setLoadError(failures.join(" "));
    setLoading(false);
  }, [currentPage, domain, severity, status]);
  useEffect(() => {
    void load();
  }, [load]);
  async function scan() {
    setScanning(true);
    setOperationError("");
    try {
      const response = await fetch("/api/reconciliation/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": createBrowserUuid(),
        },
        body: JSON.stringify({ overdueHours: 168 }),
      });
      const payload = (await response.json()) as {
        data?: ReconciliationRun;
        message?: string;
      };
      if (!response.ok || !payload.data)
        throw new Error(payload.message || "Unable to run scan.");
      setLastRun(payload.data);
      await load();
    } catch (scanError) {
      setOperationError(
        scanError instanceof Error ? scanError.message : "Unable to run scan.",
      );
    } finally {
      setScanning(false);
    }
  }
  async function retry(runId: string) {
    setRetrying(runId);
    setOperationError("");
    try {
      const response = await fetch(`/api/reconciliation/runs/${runId}/retry`, {
        method: "POST",
      });
      const payload = (await response.json()) as {
        data?: { jobId: string };
        message?: string;
      };
      if (!response.ok || !payload.data)
        throw new Error(payload.message || "Unable to queue retry.");
      await load();
    } catch (retryError) {
      setOperationError(
        retryError instanceof Error
          ? retryError.message
          : "Unable to queue retry.",
      );
    } finally {
      setRetrying("");
    }
  }
  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-[17px] font-medium text-ink">
            Cross-domain findings
          </h2>
          <p className="mt-1 max-w-3xl text-[12px] leading-5 text-ink2">
            Persistent investigation queue across inventory, payment, shipping,
            refunds, and settlements. A scan records evidence and auto-resolves
            conditions that disappear.
          </p>
        </div>
        <button
          onClick={() => void scan()}
          disabled={scanning}
          className="rounded-full border border-line px-4 py-2 text-[12px] text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-40"
        >
          {scanning ? "Scanning…" : "Run reconciliation scan"}
        </button>
      </div>
      {queueHealth && (
        <div className="mt-5 border-y border-line py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-1 text-[10px] ${
                  queueHealth.available
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-rose-50 text-rose-700"
                }`}
              >
                queue {queueHealth.available ? "available" : "unavailable"}
              </span>
              <span className="text-[10px] uppercase tracking-eyebrow text-ink2">
                schedule {queueHealth.scheduleEnabled ? "enabled" : "disabled"}
                {queueHealth.scheduleEnabled &&
                  ` · every ${queueHealth.scheduleEveryMinutes}m`}
              </span>
            </div>
            {queueHealth.counts && (
              <p className="text-[11px] text-ink2">
                Waiting {queueHealth.counts.waiting} · active{" "}
                {queueHealth.counts.active} · delayed{" "}
                {queueHealth.counts.delayed} · failed{" "}
                {queueHealth.counts.failed}
              </p>
            )}
          </div>
          {queueHealth.scheduler && (
            <p className="mt-2 text-[10px] text-ink2">
              Next scheduled scan{" "}
              {new Date(queueHealth.scheduler.next).toLocaleString("en-BD")}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[10px] text-ink2">
            <p>
              Last {queueHealth.operations.windowHours}h: completed{" "}
              {queueHealth.operations.completedCount} · failed{" "}
              {queueHealth.operations.failedCount}
            </p>
            <p>
              Success{" "}
              {queueHealth.operations.successRate === null
                ? "not available"
                : `${queueHealth.operations.successRate}%`}
            </p>
            <p>
              Average duration{" "}
              {queueHealth.operations.averageDurationMs === null
                ? "not available"
                : `${queueHealth.operations.averageDurationMs}ms`}
            </p>
            <p>
              Last success{" "}
              {queueHealth.operations.lastSuccess?.completedAt
                ? new Date(
                    queueHealth.operations.lastSuccess.completedAt,
                  ).toLocaleString("en-BD")
                : "not recorded"}
            </p>
          </div>
          {queueHealth.error && (
            <p className="mt-2 text-[10px] text-rose-700">
              {queueHealth.error}
            </p>
          )}
          {queueHealth.recentRuns.some((run) => run.status === "FAILED") && (
            <div className="mt-4 divide-y divide-line border-t border-line">
              {queueHealth.recentRuns
                .filter((run) => run.status === "FAILED")
                .map((run) => (
                  <div
                    key={run.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3"
                  >
                    <div>
                      <p className="text-[11px] font-medium text-ink">
                        {run.reference} · failed attempt {run.attemptCount}
                      </p>
                      <p className="mt-1 max-w-2xl text-[10px] text-ink2">
                        {run.failureReason || "No failure reason recorded."}
                      </p>
                    </div>
                    <button
                      onClick={() => void retry(run.id)}
                      disabled={retrying === run.id || !queueHealth.available}
                      className="rounded-full border border-line px-3 py-1.5 text-[10px] text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-40"
                    >
                      {retrying === run.id ? "Queuing…" : "Retry failed run"}
                    </button>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <select
          aria-label="Filter findings by status"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setCurrentPage(1);
          }}
          className={`${fieldClass} rounded-full`}
        >
          <option value="OPEN">Open</option>
          <option value="ACKNOWLEDGED">Acknowledged</option>
          <option value="RESOLVED">Resolved</option>
          <option value="">All statuses</option>
        </select>
        <select
          aria-label="Filter findings by domain"
          value={domain}
          onChange={(event) => {
            setDomain(event.target.value);
            setCurrentPage(1);
          }}
          className={`${fieldClass} rounded-full`}
        >
          <option value="">All domains</option>
          {["INVENTORY", "PAYMENT", "SHIPPING", "REFUND", "SETTLEMENT"].map(
            (value) => (
              <option key={value}>{value}</option>
            ),
          )}
        </select>
        <select
          aria-label="Filter findings by severity"
          value={severity}
          onChange={(event) => {
            setSeverity(event.target.value);
            setCurrentPage(1);
          }}
          className={`${fieldClass} rounded-full`}
        >
          <option value="">All severity</option>
          {["CRITICAL", "HIGH", "MEDIUM", "LOW"].map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
        <p className="self-center text-[11px] text-ink2">
          Open {page?.summary.OPEN ?? 0} · acknowledged{" "}
          {page?.summary.ACKNOWLEDGED ?? 0} · resolved{" "}
          {page?.summary.RESOLVED ?? 0}
        </p>
      </div>
      {lastRun && (
        <p className="mt-3 text-[11px] text-ink2">
          {lastRun.reference}: detected {lastRun.detectedCount}, opened{" "}
          {lastRun.openedCount}, auto-resolved {lastRun.autoResolvedCount}.
        </p>
      )}
      {loadError && (
        <div
          role="alert"
          className="mt-3 flex flex-wrap items-center justify-between gap-3 border-y border-rose-200 bg-rose-50 px-4 py-3 text-[11px] text-rose-700"
        >
          <p>{loadError}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-full border border-rose-200 px-3 py-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
          >
            Retry
          </button>
        </div>
      )}
      {operationError && (
        <p role="alert" className="mt-3 text-[11px] text-rose-700">
          {operationError}
        </p>
      )}
      <div className="mt-5 divide-y divide-line border-y border-line">
        {page?.items.map((entry) => {
          const href = entityHref(entry);
          return (
            <article key={entry.id} className="py-5">
              <div className="flex flex-wrap justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] ${severityClass[entry.severity]}`}
                    >
                      {formatEnum(entry.severity)}
                    </span>
                    <span className="text-[10px] uppercase tracking-eyebrow text-ink2">
                      {entry.domain} · age {ageLabel(entry.firstDetectedAt)} ·
                      seen {entry.occurrenceCount}×
                    </span>
                  </div>
                  <h3 className="mt-2 text-[13px] font-medium text-ink">
                    {entry.title}
                  </h3>
                  <p className="mt-1 max-w-3xl text-[11px] leading-5 text-ink2">
                    {entry.description}
                  </p>
                  {href && (
                    <Link
                      href={href}
                      className="mt-2 inline-block text-[11px] text-ink underline decoration-line underline-offset-4"
                    >
                      Open related order
                    </Link>
                  )}
                </div>
                <div className="text-right text-[10px] text-ink2">
                  <p>{formatEnum(entry.status)}</p>
                  <p className="mt-1">
                    Owner {entry.ownerActorId || "unassigned"}
                  </p>
                </div>
              </div>
              {(entry.acknowledgementNote || entry.resolutionNote) && (
                <p className="mt-3 rounded-card bg-surface px-3 py-2 text-[10px] text-ink2">
                  {entry.resolutionNote || entry.acknowledgementNote}
                </p>
              )}
              <ActionForm entry={entry} reload={() => void load()} />
            </article>
          );
        })}
        {loading && !page?.items.length && (
          <p className="py-12 text-center text-[12px] text-ink2">
            Loading reconciliation findings…
          </p>
        )}
        {!loading && page?.items.length === 0 && (
          <p className="py-12 text-center text-[12px] text-ink2">
            No findings in this view.
          </p>
        )}
      </div>
      {page && (
        <Pagination
          currentPage={page.page}
          totalPages={page.totalPages}
          totalItems={page.total}
          pageSize={page.limit}
          onPageChange={setCurrentPage}
          isLoading={loading}
        />
      )}
    </section>
  );
}
