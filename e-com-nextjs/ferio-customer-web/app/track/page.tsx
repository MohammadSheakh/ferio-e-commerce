"use client";

import { FormEvent, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { OrderTracking } from "@/lib/tracking";

function formatTaka(amount: number) {
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  }).format(amount);
}

function TrackOrderContent() {
  const searchParams = useSearchParams();
  const [tracking, setTracking] = useState<OrderTracking | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function trackOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setLoading(true);
    setError("");
    setTracking(null);
    try {
      const response = await fetch("/api/tracking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reference: String(form.get("reference") || ""),
          phone: String(form.get("phone") || ""),
        }),
      });
      const payload = (await response.json()) as {
        data?: OrderTracking;
        message?: string;
      };
      if (!response.ok || !payload.data) {
        throw new Error(payload.message || "Order details could not be verified.");
      }
      setTracking(payload.data);
    } catch (trackingError) {
      setError(
        trackingError instanceof Error
          ? trackingError.message
          : "Tracking is temporarily unavailable.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-16 md:py-24">
      <div className="grid gap-12 lg:grid-cols-[0.82fr_1.18fr]">
        <section>
          <p className="text-[11px] uppercase tracking-eyebrow text-ink2">Delivery status</p>
          <h1 className="mt-3 text-[34px] font-semibold tracking-tight text-ink">Track your order</h1>
          <p className="mt-4 max-w-md text-[14px] leading-6 text-ink2">
            Enter the order reference from your confirmation and the same phone number used at checkout.
          </p>
          <form onSubmit={trackOrder} className="mt-8 space-y-5">
            <label className="block text-[12px] text-ink2">
              Order reference
              <input required name="reference" defaultValue={searchParams.get("reference") ?? ""} minLength={8} maxLength={40} autoComplete="off" placeholder="FER-260806-ABC123" className="mt-2 w-full rounded-card border border-line bg-white px-4 py-3 text-[14px] uppercase text-ink outline-none transition focus:border-ink" />
            </label>
            <label className="block text-[12px] text-ink2">
              Checkout phone
              <input required name="phone" type="tel" minLength={11} maxLength={20} autoComplete="tel" placeholder="01XXXXXXXXX" className="mt-2 w-full rounded-card border border-line bg-white px-4 py-3 text-[14px] text-ink outline-none transition focus:border-ink" />
            </label>
            <button disabled={loading} className="rounded-full bg-ink px-6 py-3 text-[14px] font-medium text-white disabled:opacity-50">
              {loading ? "Checking order…" : "Track order"}
            </button>
          </form>
          {error && <p role="alert" className="mt-5 text-[13px] text-red-700">{error}</p>}
        </section>

        <section aria-live="polite">
          {tracking ? (
            <div className="rounded-card border border-line p-6 md:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-6">
                <div>
                  <p className="text-[11px] uppercase tracking-eyebrow text-ink2">{tracking.reference}</p>
                  <h2 className="mt-2 text-[24px] font-semibold tracking-tight text-ink">{tracking.shipment?.statusLabel ?? tracking.statusLabel}</h2>
                </div>
                <div className="text-right text-[12px] text-ink2">
                  <p>{formatTaka(tracking.total)} · Cash on delivery</p>
                  <p className="mt-1">Placed {new Date(tracking.createdAt).toLocaleDateString("en-BD")}</p>
                </div>
              </div>
              {tracking.shipment && (
                <div className="mt-6 flex flex-wrap justify-between gap-3 rounded-card bg-[#f7f7f7] p-4 text-[12px]">
                  <div><p className="text-ink2">Courier</p><p className="mt-1 text-ink">{tracking.shipment.provider}</p></div>
                  <div className="text-right"><p className="text-ink2">Tracking number</p><p className="mt-1 text-ink">{tracking.shipment.trackingNumber || "Being assigned"}</p></div>
                </div>
              )}
              <ol className="mt-8 space-y-0">
                {tracking.timeline.map((entry, index) => (
                  <li key={`${entry.code}-${entry.occurredAt}-${index}`} className="grid grid-cols-[18px_1fr] gap-4">
                    <div className="flex flex-col items-center">
                      <span className="mt-1 h-2.5 w-2.5 rounded-full bg-ink" />
                      {index < tracking.timeline.length - 1 && <span className="min-h-12 w-px flex-1 bg-line" />}
                    </div>
                    <div className="pb-7"><p className="text-[14px] text-ink">{entry.label}</p><time className="mt-1 block text-[11px] text-ink2">{new Date(entry.occurredAt).toLocaleString("en-BD")}</time></div>
                  </li>
                ))}
              </ol>
            </div>
          ) : (
            <div className="flex min-h-[360px] items-center justify-center border-y border-line px-8 text-center">
              <p className="max-w-sm text-[13px] leading-6 text-ink2">Verified tracking updates will appear here. We never expose order details from a reference alone.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default function TrackOrderPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-5xl px-6 py-24 text-[13px] text-ink2">
          Loading order tracking…
        </main>
      }
    >
      <TrackOrderContent />
    </Suspense>
  );
}
