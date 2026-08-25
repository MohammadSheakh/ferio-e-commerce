"use client";
import { useEffect, useState } from "react";

interface PlanStatus {
  code: "LEGACY" | "ACTIVE" | "TENANT_MEMBERSHIP_REQUIRED" | string;
  plan?: { key: string; displayName: string };
  subscription?: { status: string; currentPeriodEnd?: string };
  usage?: Record<string, string>;
  limits?: Record<string, number>;
}

const METRIC_LABELS: Record<string, string> = {
  orders_per_month: "Orders this month",
  products_max: "Products in catalog",
};

/**
 * Plan & Usage summary (MT-10 §13.2): shows current plan, usage against
 * limits, and an upgrade call-to-action as limits approach. Renders nothing
 * in legacy mode — legacy deployments are not SaaS tenants.
 */
export default function PlanUsageCard() {
  const [status, setStatus] = useState<PlanStatus | null>(null);

  useEffect(() => {
    fetch("/api/admin/plan-status")
      .then((r) => r.json())
      .then((payload) => setStatus((payload.data ?? null) as PlanStatus | null))
      .catch(() => setStatus(null));
  }, []);

  if (!status || status.code !== "ACTIVE" || !status.plan) return null;

  const metrics = Object.entries({ ...(status.usage ?? {}) }).map(([metric, value]) => ({
    metric,
    label: METRIC_LABELS[metric] ?? metric,
    used: Number(value),
    limit: status.limits?.[metric],
  }));

  return (
    <div className="rounded-card border border-line bg-paper p-5">
      <p className="text-[11px] uppercase tracking-eyebrow text-ink2">Plan &amp; Usage</p>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-[18px] font-semibold">{status.plan.displayName}</span>
        <span className="statuspill">{status.subscription?.status ?? ""}</span>
      </div>
      <ul className="mt-3 space-y-1.5 text-[13px]">
        {metrics.map(({ metric, label, used, limit }) => (
          <li key={metric} className="flex justify-between">
            <span className="text-ink2">{label}</span>
            <span>
              {used}
              {limit != null ? ` / ${limit}` : ""}
              {limit != null && used >= limit && (
                <em className="ml-1 not-italic text-[12px] text-rose-700">limit reached</em>
              )}
            </span>
          </li>
        ))}
      </ul>
      <a href="/dashboard/settings" style={{ fontSize: 12 }} className="mt-3 inline-block underline">
        Manage subscription
      </a>
    </div>
  );
}
