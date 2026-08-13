"use client";

import { FormEvent, useEffect, useState } from "react";

export default function PaymentRetryPage() {
  const [reference, setReference] = useState("");
  const [phone, setPhone] = useState("");
  const [provider, setProvider] = useState<"SSLCOMMERZ" | "AAMARPAY">("SSLCOMMERZ");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setReference(new URLSearchParams(window.location.search).get("reference") || "");
  }, []);

  async function retry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/payments/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference, phone, provider }),
      });
      const payload = (await response.json()) as { data?: { redirectUrl?: string }; message?: string };
      if (!response.ok || !payload.data?.redirectUrl) throw new Error(payload.message || "Unable to prepare payment retry.");
      window.location.assign(payload.data.redirectUrl);
    } catch (retryError) {
      setError(retryError instanceof Error ? retryError.message : "Unable to prepare payment retry.");
      setSubmitting(false);
    }
  }

  const inputClass = "mt-1.5 w-full rounded-card border border-line bg-white px-4 py-3 text-[14px] text-ink outline-none focus:border-ink";
  return <main className="mx-auto max-w-xl px-6 py-20">
    <p className="text-[11px] uppercase tracking-eyebrow text-ink2">Secure payment recovery</p>
    <h1 className="mt-2 text-[30px] font-semibold tracking-tight text-ink">Retry your prepaid order</h1>
    <p className="mt-2 text-[14px] leading-6 text-ink2">We verify the order and mobile number, then reserve stock again before opening a new hosted payment session.</p>
    <form onSubmit={retry} className="mt-9 space-y-5 rounded-card border border-line p-6">
      <label className="block text-[12px] text-ink2">Order reference<input required minLength={8} maxLength={40} value={reference} onChange={(event) => setReference(event.target.value)} className={inputClass} /></label>
      <label className="block text-[12px] text-ink2">Bangladesh mobile<input required minLength={11} maxLength={20} value={phone} onChange={(event) => setPhone(event.target.value)} className={inputClass} /></label>
      <label className="block text-[12px] text-ink2">Payment provider<select value={provider} onChange={(event) => setProvider(event.target.value as typeof provider)} className={inputClass}><option value="SSLCOMMERZ">SSLCommerz</option><option value="AAMARPAY">aamarPay</option></select></label>
      {error && <p role="alert" className="text-[13px] text-rose-700">{error}</p>}
      <button disabled={submitting} className="rounded-full bg-ink px-6 py-3 text-[14px] font-medium text-white disabled:opacity-40">{submitting ? "Preparing secure payment…" : "Continue to payment"}</button>
    </form>
  </main>;
}
