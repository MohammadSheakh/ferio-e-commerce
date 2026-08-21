"use client";

import { useCallback, useEffect, useState } from "react";
import Topbar from "@/components/Topbar";
import type { OperationsHealth } from "@/lib/operations-health";

function Status({ healthy, label }: { healthy: boolean; label: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] ${
        healthy ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
      }`}
    >
      {label}
    </span>
  );
}

function Metric({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="rounded-card border border-line p-5">
      <p className="text-[10px] uppercase tracking-eyebrow text-ink2">
        {label}
      </p>
      <p className="mt-3 text-[24px] font-semibold tracking-tight text-ink">
        {value}
      </p>
      {note && <p className="mt-1 text-[11px] text-ink2">{note}</p>}
    </div>
  );
}

function formatDuration(seconds: number) {
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  return days > 0 ? `${days}d ${hours}h` : `${hours}h`;
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString("en-BD") : "No evidence";
}

export default function OperationsHealthPage() {
  const [health, setHealth] = useState<OperationsHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/operations/health", {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        data?: OperationsHealth;
        message?: string;
      };
      if (!response.ok || !payload.data) {
        throw new Error(payload.message || "Unable to load system health.");
      }
      setHealth(payload.data);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load system health.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <Topbar
        title="System health"
        subtitle="Runtime, queues, commerce, providers, backup, and restore evidence"
      />
      <main className="space-y-10 p-8">
        <section className="flex flex-wrap items-start justify-between gap-5 border-b border-line pb-7">
          <div>
            <p className="text-[11px] uppercase tracking-eyebrow text-ink2">
              Launch evidence
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h2 className="text-[20px] font-semibold tracking-tight text-ink">
                {health?.launchReady
                  ? "Launch checks clear"
                  : "Launch blockers remain"}
              </h2>
              {health && (
                <Status
                  healthy={health.runtimeStatus === "HEALTHY"}
                  label={health.runtimeStatus.toLowerCase()}
                />
              )}
            </div>
            <p className="mt-2 text-[12px] text-ink2">
              {health
                ? `Generated ${new Date(health.generatedAt).toLocaleString("en-BD")}`
                : "Loading current evidence…"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="rounded-full bg-ink px-5 py-2.5 text-[12px] text-white disabled:opacity-40"
          >
            {loading ? "Checking…" : "Refresh evidence"}
          </button>
        </section>

        {error && (
          <p role="alert" className="text-[12px] text-rose-700">
            {error}
          </p>
        )}

        {health && (
          <>
            {health.launchBlockers.length > 0 && (
              <section className="border-y border-line py-5">
                <h2 className="text-[15px] font-medium text-ink">
                  Launch blockers
                </h2>
                <ul className="mt-3 space-y-2 text-[12px] text-rose-700">
                  {health.launchBlockers.map((blocker) => (
                    <li key={blocker}>{blocker}</li>
                  ))}
                </ul>
              </section>
            )}

            <section>
              <h2 className="text-[16px] font-medium text-ink">Runtime</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <Metric
                  label="Request p95"
                  value={`${health.requests.p95DurationMs} ms`}
                  note={`${health.requests.sampleSize} recent samples`}
                />
                <Metric
                  label="Server errors"
                  value={String(health.requests.serverErrors)}
                  note={`Since ${new Date(health.requests.observedSince).toLocaleString("en-BD")}`}
                />
                <Metric
                  label="PostgreSQL"
                  value={
                    health.dependencies.database.available
                      ? `${health.dependencies.database.latencyMs} ms`
                      : "Unavailable"
                  }
                />
                <Metric
                  label="Redis"
                  value={
                    health.dependencies.redis.available
                      ? `${health.dependencies.redis.latencyMs} ms`
                      : "Unavailable"
                  }
                />
                <Metric
                  label="Process uptime"
                  value={formatDuration(health.process.uptimeSeconds)}
                />
              </div>
            </section>

            <section>
              <div>
                <h2 className="text-[16px] font-medium text-ink">
                  Commerce evidence
                </h2>
                <p className="mt-1 text-[12px] text-ink2">
                  Durable PostgreSQL outcomes from the last{" "}
                  {health.commerce.windowHours} hours.
                </p>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Metric
                  label="Orders placed"
                  value={String(health.commerce.ordersPlaced ?? "—")}
                />
                <Metric
                  label="Delivered"
                  value={String(health.commerce.ordersDelivered ?? "—")}
                />
                <Metric
                  label="Paid orders"
                  value={String(health.commerce.paidOrders ?? "—")}
                />
                <Metric
                  label="Shipments created"
                  value={String(health.commerce.shipmentsCreated ?? "—")}
                />
                <Metric
                  label="Failed payments"
                  value={String(health.commerce.failedPaymentAttempts ?? "—")}
                />
                <Metric
                  label="Unknown payments"
                  value={String(health.commerce.unknownPaymentAttempts ?? "—")}
                />
                <Metric
                  label="Failed refunds"
                  value={String(health.commerce.failedRefunds ?? "—")}
                />
                <Metric
                  label="Open high risk"
                  value={String(health.commerce.openCriticalFindings ?? "—")}
                />
              </div>
            </section>

            <section>
              <h2 className="text-[16px] font-medium text-ink">
                Critical queues
              </h2>
              <div className="mt-4 overflow-x-auto border-y border-line">
                <table className="w-full min-w-[720px] text-left text-[12px]">
                  <thead className="text-[10px] uppercase tracking-eyebrow text-ink2">
                    <tr>
                      <th className="px-3 py-3 font-normal">Queue</th>
                      <th className="px-3 py-3 font-normal">State</th>
                      <th className="px-3 py-3 font-normal">Waiting</th>
                      <th className="px-3 py-3 font-normal">Active</th>
                      <th className="px-3 py-3 font-normal">Delayed</th>
                      <th className="px-3 py-3 font-normal">Failed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {health.queues.map((queue) => (
                      <tr key={queue.name}>
                        <td className="px-3 py-3 text-ink">{queue.name}</td>
                        <td className="px-3 py-3">
                          <Status
                            healthy={queue.available}
                            label={
                              queue.available ? "available" : "unavailable"
                            }
                          />
                        </td>
                        <td className="px-3 py-3 text-ink2">
                          {queue.counts?.waiting ?? "—"}
                        </td>
                        <td className="px-3 py-3 text-ink2">
                          {queue.counts?.active ?? "—"}
                        </td>
                        <td className="px-3 py-3 text-ink2">
                          {queue.counts?.delayed ?? "—"}
                        </td>
                        <td className="px-3 py-3 text-ink2">
                          {queue.counts?.failed ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="grid gap-8 xl:grid-cols-2">
              <div>
                <h2 className="text-[16px] font-medium text-ink">
                  Payment providers
                </h2>
                <div className="mt-4 divide-y divide-line border-y border-line">
                  {health.providers.payments.map((provider) => (
                    <div
                      key={provider.code}
                      className="flex items-center justify-between gap-4 py-3 text-[12px]"
                    >
                      <div>
                        <p className="text-ink">{provider.name}</p>
                        <p className="text-[11px] text-ink2">{provider.code}</p>
                      </div>
                      <Status
                        healthy={provider.configured}
                        label={
                          provider.configured ? "configured" : "not configured"
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h2 className="text-[16px] font-medium text-ink">
                  Courier providers
                </h2>
                <div className="mt-4 divide-y divide-line border-y border-line">
                  {health.providers.couriers.map((provider) => (
                    <div
                      key={provider.code}
                      className="flex items-center justify-between gap-4 py-3 text-[12px]"
                    >
                      <div>
                        <p className="text-ink">{provider.name}</p>
                        <p className="text-[11px] text-ink2">
                          {provider.active ? "Active" : "Inactive"} · polling{" "}
                          {provider.pollingConfigured
                            ? "configured"
                            : "not configured"}
                        </p>
                      </div>
                      <Status
                        healthy={provider.configured}
                        label={
                          provider.configured ? "configured" : "not configured"
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-[16px] font-medium text-ink">
                Backup and restore evidence
              </h2>
              <p className="mt-1 text-[12px] text-ink2">
                Deployment-reported evidence only. Production monitoring must
                independently verify the backup job.
              </p>
              <dl className="mt-4 grid gap-5 border-y border-line py-5 text-[12px] sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <dt className="text-ink2">Backup status</dt>
                  <dd className="mt-2">
                    <Status
                      healthy={health.backup.status === "CURRENT"}
                      label={health.backup.status
                        .toLowerCase()
                        .replaceAll("_", " ")}
                    />
                  </dd>
                </div>
                <div>
                  <dt className="text-ink2">Protected storage</dt>
                  <dd className="mt-2 text-ink">
                    {health.backup.protectedStorage ? "Enabled" : "No evidence"}
                  </dd>
                </div>
                <div>
                  <dt className="text-ink2">Last successful backup</dt>
                  <dd className="mt-2 text-ink">
                    {formatDate(health.backup.lastSuccessAt)}
                  </dd>
                </div>
                <div>
                  <dt className="text-ink2">Last restore exercise</dt>
                  <dd className="mt-2 text-ink">
                    {formatDate(health.backup.lastRestoreVerifiedAt)}
                  </dd>
                </div>
              </dl>
            </section>
          </>
        )}
      </main>
    </>
  );
}
