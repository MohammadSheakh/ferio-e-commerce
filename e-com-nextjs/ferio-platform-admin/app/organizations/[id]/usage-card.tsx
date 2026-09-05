"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export interface UsageMetricRow {
  metric: string;
  label: string;
  aggregation: string;
  reset: string;
  recorded: string;
  enabled: boolean;
  limit: number | null;
  usageRatio: number | null;
  warning: boolean;
}

export function UsageCard({
  organizationId,
  periodKey,
  metrics,
}: {
  organizationId: string;
  periodKey: string;
  metrics: UsageMetricRow[];
}) {
  const router = useRouter();
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");

  async function reconcile() {
    setWorking(true);
    setMessage("");
    const res = await fetch(
      `/api/platform/organizations/${organizationId}/usage/reconcile`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" },
    );
    const data = await res.json().catch(() => ({}));
    setWorking(false);
    if (res.ok) {
      const drifted = data?.data?.drifted ?? "?";
      setMessage(`Reconciled — ${drifted} counter(s) corrected.`);
      router.refresh();
    } else {
      setMessage(data.message || "Reconciliation failed.");
    }
  }

  return (
    <div className="card">
      <p className="eyebrow">Usage · period {periodKey}</p>
      <table>
        <thead>
          <tr><th>Metric</th><th>Recorded</th><th>Plan limit</th><th>State</th></tr>
        </thead>
        <tbody>
          {metrics.map((m) => (
            <tr key={m.metric}>
              <td>{m.label}</td>
              <td>{m.recorded}</td>
              <td className="muted">{m.limit ?? "—"}</td>
              <td>
                {!m.enabled ? (
                  <span className="statuspill">NOT IN PLAN</span>
                ) : m.warning ? (
                  <span className="statuspill">NEAR LIMIT</span>
                ) : (
                  <span className="statuspill">OK</span>
                )}
              </td>
            </tr>
          ))}
          {metrics.length === 0 && (
            <tr><td colSpan={4} className="muted">No usage recorded yet.</td></tr>
          )}
        </tbody>
      </table>
      <div style={{ height: 12 }} />
      <div className="row" style={{ alignItems: "center" }}>
        <button className="pill" disabled={working} onClick={reconcile}>
          {working ? "Reconciling…" : "Recount from facts"}
        </button>
        {message && <span className="muted">{message}</span>}
      </div>
    </div>
  );
}
