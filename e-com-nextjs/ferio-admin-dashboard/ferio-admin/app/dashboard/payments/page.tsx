"use client";

import { useEffect, useState } from "react";
import Topbar from "@/components/Topbar";
import type { PaymentAttempt, PaymentRecoveryHealth } from "@/lib/payments";

export default function PaymentsPage() {
  const [attempts, setAttempts] = useState<PaymentAttempt[]>([]);
  const [providers, setProviders] = useState<Array<{ code: string; name: string; configured: boolean }>>([]);
  const [error, setError] = useState("");
  const [health, setHealth] = useState<PaymentRecoveryHealth | null>(null);
  const [sweeping, setSweeping] = useState(false);
  useEffect(() => {
    Promise.all([fetch("/api/payments/attempts", { cache: "no-store" }), fetch("/api/payments/providers", { cache: "no-store" }), fetch("/api/payments/recovery/queue-health", { cache: "no-store" })])
      .then(async ([attemptResponse, providerResponse, healthResponse]) => {
        const attemptPayload = await attemptResponse.json();
        const providerPayload = await providerResponse.json();
        const healthPayload = await healthResponse.json();
        if (!attemptResponse.ok) throw new Error(attemptPayload.message || "Unable to load payments.");
        setAttempts(attemptPayload.data || []);
        setProviders(providerPayload.data || []);
        setHealth(healthPayload.data || null);
      })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Unable to load payments."));
  }, []);
  async function sweep() {
    setSweeping(true);
    setError("");
    try {
      const response = await fetch("/api/payments/recovery/sweep", { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Unable to queue recovery sweep.");
    } catch (sweepError) {
      setError(sweepError instanceof Error ? sweepError.message : "Unable to queue recovery sweep.");
    } finally {
      setSweeping(false);
    }
  }
  return <>
    <Topbar title="Payments" subtitle={`${attempts.length} recent attempts`} />
    <div className="space-y-7 p-8">
      <section className="grid gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-2">
        {providers.map((provider) => <div key={provider.code} className="bg-white p-5"><p className="text-[11px] uppercase tracking-eyebrow text-ink2">{provider.name}</p><p className="mt-2 text-[14px] font-medium text-ink">{provider.configured ? "Configured" : "Credentials missing"}</p></div>)}
      </section>
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-card border border-line p-5"><div><p className="text-[11px] uppercase tracking-eyebrow text-ink2">Expiry recovery</p><p className="mt-2 text-[14px] font-medium text-ink">{health?.available ? "Queue available" : "Queue unavailable"} · {health?.eligibleCount ?? 0} due</p><p className="mt-1 text-[12px] text-ink2">{health?.enabled ? `Automatic sweep every ${health.everyMinutes} minutes` : "Automatic recovery disabled by deployment configuration"}</p></div><button onClick={() => void sweep()} disabled={sweeping || !health?.available} className="rounded-full border border-line px-4 py-2 text-[12px] text-ink disabled:opacity-40">{sweeping ? "Queueing…" : "Run recovery sweep"}</button></section>
      {error && <p role="alert" className="text-[13px] text-rose-700">{error}</p>}
      <div className="overflow-x-auto rounded-card border border-line"><table className="w-full min-w-[980px] text-left"><thead><tr className="text-[11px] uppercase tracking-eyebrow text-ink2"><th className="px-5 py-3 font-normal">Order</th><th className="px-5 py-3 font-normal">Provider</th><th className="px-5 py-3 font-normal">Merchant transaction</th><th className="px-5 py-3 font-normal">Amount</th><th className="px-5 py-3 font-normal">Callbacks</th><th className="px-5 py-3 font-normal">Created</th><th className="px-5 py-3 font-normal">Status</th></tr></thead><tbody className="divide-y divide-line">
        {attempts.map((attempt) => <tr key={attempt.id} className="text-[13px]"><td className="px-5 py-3.5 font-medium text-ink">{attempt.order.reference}</td><td className="px-5 py-3.5 text-ink2">{attempt.provider === "AAMARPAY" ? "aamarPay" : "SSLCommerz"}</td><td className="px-5 py-3.5 text-ink2">{attempt.merchantTransactionId}</td><td className="px-5 py-3.5 text-ink2">৳{(attempt.amount / 100).toLocaleString("en-BD", { minimumFractionDigits: 2 })}</td><td className="px-5 py-3.5 text-ink2">{attempt.callbacks.length}</td><td className="px-5 py-3.5 text-ink2">{new Date(attempt.createdAt).toLocaleString("en-BD")}</td><td className="px-5 py-3.5"><span className="rounded-full bg-surface px-2.5 py-1 text-[11px] text-ink2">{attempt.status.toLowerCase()}</span>{attempt.failureMessage && <p className="mt-1 max-w-60 text-[11px] text-rose-700">{attempt.failureMessage}</p>}</td></tr>)}
        {attempts.length === 0 && <tr><td colSpan={7} className="px-5 py-14 text-center text-[13px] text-ink2">No prepaid payment attempts yet.</td></tr>}
      </tbody></table></div>
    </div>
  </>;
}
