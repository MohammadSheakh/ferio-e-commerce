"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { createBrowserIdempotencyKey } from "@/lib/browser-identifiers";
import { formatTaka } from "@/lib/catalog";
import type { WalletSummary } from "@/lib/wallet";

export default function WalletPage() {
  const [summary, setSummary] = useState<WalletSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function load() {
    const response = await fetch("/api/account/wallet", { cache: "no-store" });
    const payload = await response.json();
    if (response.status === 401) setUnauthorized(true);
    else if (response.ok) setSummary(payload.data);
    else setMessage({ type: "error", text: payload.message || "Unable to load your wallet." });
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function submitTopUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/account/wallet/top-ups", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": createBrowserIdempotencyKey(),
      },
      body: JSON.stringify({
        provider: form.get("provider"),
        amount: Math.round(Number(form.get("amount")) * 100),
        customerReference: form.get("customerReference"),
        customerNote: form.get("customerNote") || undefined,
      }),
    });
    const payload = await response.json();
    if (response.ok) {
      event.currentTarget.reset();
      setMessage({
        type: "success",
        text: "Top-up submitted for verification. Your balance changes only after approval.",
      });
      await load();
    } else {
      setMessage({ type: "error", text: payload.message || "Unable to submit top-up." });
    }
    setSubmitting(false);
  }

  if (loading) {
    return <main className="mx-auto max-w-5xl px-6 py-20 text-[13px] text-ink2">Loading your wallet…</main>;
  }

  if (unauthorized) {
    return (
      <main className="mx-auto max-w-xl px-6 py-20">
        <h1 className="text-[30px] font-semibold tracking-tight text-ink">Your Ferio wallet</h1>
        <p className="mt-3 text-[13px] leading-6 text-ink2">Sign in to recharge your wallet and pay for orders from its verified balance.</p>
        <Link href="/account/login?next=/account/wallet" className="mt-7 inline-block rounded-full bg-ink px-6 py-3 text-[13px] text-white">Sign in</Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <p className="text-[11px] uppercase tracking-eyebrow text-ink2">Customer account</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[30px] font-semibold tracking-tight text-ink">Ferio wallet</h1>
          <p className="mt-2 max-w-2xl text-[13px] leading-6 text-ink2">Recharge using bKash, Nagad, Rocket, or bank transfer evidence, then use approved funds during checkout.</p>
        </div>
        <Link href="/account/notifications" className="rounded-full border border-line px-5 py-2.5 text-[12px] text-ink">Notifications</Link>
      </div>

      <section className="mt-10 grid gap-4 sm:grid-cols-3">
        <div className="rounded-card border border-ink bg-ink p-6 text-white">
          <p className="text-[11px] uppercase tracking-eyebrow text-white/60">Available balance</p>
          <p className="mt-3 text-[30px] font-semibold">{formatTaka(summary?.wallet.balance ?? 0)}</p>
          <p className="mt-2 text-[11px] text-white/60">BDT · {summary?.wallet.status}</p>
        </div>
        <div className="rounded-card border border-line bg-surface p-6 sm:col-span-2">
          <p className="text-[11px] uppercase tracking-eyebrow text-ink2">Important</p>
          <p className="mt-3 text-[13px] leading-6 text-ink">Top-up references are reviewed before credit. Never submit the same provider transaction twice. Wallet order payment and stock reservation happen together, so a failed debit cannot create a paid order.</p>
        </div>
      </section>

      {message && <div role="status" className={`mt-6 rounded-card border p-4 text-[13px] ${message.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-red-200 bg-red-50 text-red-900"}`}>{message.text}</div>}

      <div className="mt-10 grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
        <section>
          <h2 className="text-[18px] font-medium text-ink">Request a top-up</h2>
          <p className="mt-2 text-[12px] leading-5 text-ink2">Enter the exact provider or bank transaction reference after sending funds to Ferio&apos;s configured receiving account.</p>
          <form onSubmit={submitTopUp} className="mt-6 space-y-4 border-y border-line py-6">
            <label className="block text-[12px] text-ink2">Method
              <select name="provider" className="mt-1.5 w-full rounded-card border border-line bg-white px-4 py-3 text-[13px] text-ink">
                <option value="BKASH">bKash</option>
                <option value="NAGAD">Nagad</option>
                <option value="ROCKET">Rocket</option>
                <option value="BANK_TRANSFER">Bank transfer</option>
              </select>
            </label>
            <label className="block text-[12px] text-ink2">Amount (BDT)
              <input name="amount" type="number" min="10" max="100000" step="0.01" required className="mt-1.5 w-full rounded-card border border-line px-4 py-3 text-[13px] text-ink" />
            </label>
            <label className="block text-[12px] text-ink2">Transaction reference
              <input name="customerReference" minLength={4} maxLength={120} required className="mt-1.5 w-full rounded-card border border-line px-4 py-3 text-[13px] text-ink" />
            </label>
            <label className="block text-[12px] text-ink2">Note <span className="text-ink2/60">(optional)</span>
              <textarea name="customerNote" rows={3} maxLength={500} className="mt-1.5 w-full rounded-card border border-line px-4 py-3 text-[13px] text-ink" />
            </label>
            <button disabled={submitting} className="rounded-full bg-ink px-6 py-3 text-[13px] text-white disabled:opacity-40">{submitting ? "Submitting…" : "Submit for verification"}</button>
          </form>
        </section>

        <section>
          <h2 className="text-[18px] font-medium text-ink">Recent activity</h2>
          <div className="mt-6 divide-y divide-line border-y border-line">
            {summary?.transactions.length ? summary.transactions.map((transaction) => (
              <div key={transaction.id} className="flex items-start justify-between gap-4 py-4">
                <div>
                  <p className="text-[13px] font-medium text-ink">{transaction.description}</p>
                  <p className="mt-1 text-[11px] text-ink2">{new Date(transaction.createdAt).toLocaleString()} · Balance {formatTaka(transaction.balanceAfter)}</p>
                </div>
                <p className={`text-[13px] font-medium ${transaction.type === "credit" ? "text-emerald-700" : "text-ink"}`}>{transaction.type === "credit" ? "+" : "−"}{formatTaka(transaction.amount)}</p>
              </div>
            )) : <p className="py-8 text-[13px] text-ink2">No wallet transactions yet.</p>}
          </div>

          <h2 className="mt-10 text-[18px] font-medium text-ink">Top-up requests</h2>
          <div className="mt-6 divide-y divide-line border-y border-line">
            {summary?.topUps.length ? summary.topUps.map((topUp) => (
              <div key={topUp.id} className="flex items-start justify-between gap-4 py-4">
                <div>
                  <p className="text-[13px] font-medium text-ink">{topUp.provider.replace("_", " ")} · {topUp.customerReference}</p>
                  <p className="mt-1 text-[11px] text-ink2">{topUp.status.replaceAll("_", " ").toLowerCase()}{topUp.reviewNote ? ` · ${topUp.reviewNote}` : ""}</p>
                </div>
                <p className="text-[13px] font-medium text-ink">{formatTaka(topUp.amount)}</p>
              </div>
            )) : <p className="py-8 text-[13px] text-ink2">No top-up requests yet.</p>}
          </div>
        </section>
      </div>
    </main>
  );
}
