import Link from "next/link";
import type { OperationalAlertResponse } from "@/lib/operational-alerts";

function severityClass(severity: "CRITICAL" | "HIGH" | "MEDIUM") {
  if (severity === "CRITICAL") return "bg-rose-50 text-rose-700";
  if (severity === "HIGH") return "bg-amber-50 text-amber-700";
  return "bg-surface text-ink2";
}

export default function OperationalAlerts({
  data,
  unavailable,
}: {
  data: OperationalAlertResponse | null;
  unavailable: boolean;
}) {
  if (unavailable) {
    return (
      <section className="rounded-card border border-amber-200 bg-amber-50/60 p-5">
        <h2 className="text-[13px] font-medium text-amber-900">
          Operational alerts unavailable
        </h2>
        <p className="mt-1 text-[12px] leading-5 text-amber-800">
          Critical-path evidence could not be evaluated. Check Backend and
          database health before continuing operations.
        </p>
      </section>
    );
  }
  if (!data) return null;

  return (
    <section className="rounded-card border border-line">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line px-5 py-4">
        <div>
          <h2 className="text-[13px] font-medium text-ink">
            Operational alerts
          </h2>
          <p className="mt-1 text-[11px] text-ink2">
            Recent provider failures plus unresolved high-risk reconciliation
            findings.
          </p>
        </div>
        <div className="flex gap-3 text-[11px] text-ink2">
          <span>{data.summary.critical} critical</span>
          <span>{data.summary.high} high</span>
          <span>{data.summary.medium} medium</span>
        </div>
      </div>

      {data.alerts.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <p className="text-[13px] text-ink">No active operational alerts.</p>
          <p className="mt-1 text-[11px] text-ink2">
            Recent critical paths and provider evidence are within configured
            thresholds.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-line">
          {data.alerts.map((alert) => (
            <article
              key={alert.code}
              className="grid gap-3 px-5 py-4 md:grid-cols-[110px_1fr_150px]"
            >
              <div>
                <span
                  className={`rounded-full px-2.5 py-1 text-[10px] ${severityClass(alert.severity)}`}
                >
                  {alert.severity.toLowerCase()} · {alert.count}
                </span>
              </div>
              <div>
                <h3 className="text-[13px] font-medium text-ink">
                  {alert.title}
                </h3>
                <p className="mt-1 text-[11px] leading-5 text-ink2">
                  {alert.detail}
                </p>
                {alert.oldestAt && (
                  <p className="mt-1 text-[10px] text-ink2">
                    Oldest evidence:{" "}
                    {new Date(alert.oldestAt).toLocaleString("en-BD")}
                  </p>
                )}
              </div>
              <Link
                href={alert.actionHref}
                className="h-fit text-[12px] text-ink underline decoration-line underline-offset-4 md:text-right"
              >
                {alert.actionLabel}
              </Link>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
